const { z } = require('zod');
const { nanoid } = require('nanoid');
const prisma = require('../lib/prisma');
const { asyncHandler, badRequest, notFound } = require('../utils/http');
const { getOrCreateCart, priceOf } = require('../services/cart');
const { sendOrderConfirmation, sendStatusEmail, sendBankInstructions } = require('../services/orderEmails');

const addressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

const placeOrderSchema = z.object({
  email: z.string().email(),
  address: addressSchema,
  shippingMethodId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['card', 'stripe', 'paypal', 'cod', 'bank_transfer']),
});

async function loadCartLines(cartId) {
  const items = await prisma.cartItem.findMany({ where: { cartId }, include: { product: true } });
  return items;
}

async function computeTotals(cartId, shippingMethodId) {
  const items = await loadCartLines(cartId);
  const subtotal = items.reduce((s, it) => s + priceOf(it.product) * it.quantity, 0);
  let shippingFee = 0;
  let shippingMethod = null;
  if (shippingMethodId) {
    shippingMethod = await prisma.shippingMethod.findUnique({ where: { id: shippingMethodId } });
    if (shippingMethod && shippingMethod.enabled) shippingFee = Number(shippingMethod.fee);
  }
  // Free shipping over $50 (matches storefront copy).
  if (subtotal >= 50) shippingFee = 0;
  const total = subtotal + shippingFee;
  return {
    items,
    subtotal: +subtotal.toFixed(2),
    shippingFee: +shippingFee.toFixed(2),
    total: +total.toFixed(2),
    shippingMethod,
  };
}

// POST /api/checkout/totals
const calculateTotals = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req, res);
  const shippingMethodId = req.body?.shippingMethodId ? Number(req.body.shippingMethodId) : null;
  const { subtotal, shippingFee, total } = await computeTotals(cart.id, shippingMethodId);
  res.json({ subtotal, shippingFee, total, freeShippingThreshold: 50 });
});

// POST /api/checkout
const placeOrder = asyncHandler(async (req, res) => {
  const { email, address, shippingMethodId, paymentMethod } = req.body;
  const cart = await getOrCreateCart(req, res);

  const { items, subtotal, shippingFee, total, shippingMethod } = await computeTotals(cart.id, shippingMethodId);
  if (items.length === 0) throw badRequest('Your bag is empty');

  // Verify payment method is enabled
  const pmConfig = await prisma.paymentMethodConfig.findUnique({ where: { method: paymentMethod } });
  if (pmConfig && !pmConfig.enabled) throw badRequest('That payment method is not available');

  // Stock check
  for (const it of items) {
    if (it.product.status !== 'active') throw badRequest(`${it.product.name} is no longer available`);
    if (it.product.stock < it.quantity) throw badRequest(`Not enough stock for ${it.product.name}`);
  }

  const orderNumber = `RC81-${nanoid(8).toUpperCase()}`;
  // Bank transfer waits for slip + approval; COD ships then collects; card/stripe/paypal
  // are simulated as paid instantly.
  const isBank = paymentMethod === 'bank_transfer';
  const simulatedPaid = ['card', 'stripe', 'paypal'].includes(paymentMethod);
  const orderStatus = isBank ? 'awaiting_payment' : 'awaiting_shipment';
  const paymentStatus = simulatedPaid ? 'paid' : 'pending';

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: req.user?.id || null,
        customerEmail: email,
        status: orderStatus,
        subtotal,
        shippingFee,
        total,
        shippingMethodId: shippingMethod?.id || null,
        shipName: address.fullName,
        shipPhone: address.phone,
        shipLine1: address.line1,
        shipLine2: address.line2,
        shipCity: address.city,
        shipState: address.state,
        shipPostalCode: address.postalCode,
        shipCountry: address.country,
        items: {
          create: items.map((it) => {
            const unit = priceOf(it.product);
            return {
              productId: it.productId,
              name: it.product.name,
              sku: it.product.sku,
              unitPrice: unit,
              quantity: it.quantity,
              lineTotal: +(unit * it.quantity).toFixed(2),
            };
          }),
        },
        payment: {
          create: {
            method: paymentMethod,
            status: paymentStatus,
            amount: total,
            transactionId: simulatedPaid ? `SIM-${nanoid(10).toUpperCase()}` : null,
            paidAt: simulatedPaid ? new Date() : null,
          },
        },
      },
      include: { items: true },
    });

    // Decrement stock
    for (const it of items) {
      // eslint-disable-next-line no-await-in-loop
      await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
    }

    // Empty the cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Award pixel coins to logged-in customer ($1 = 1 coin)
    if (req.user) {
      await tx.user.update({ where: { id: req.user.id }, data: { coins: { increment: Math.floor(total) } } });
    }

    return created;
  });

  // Fire emails (async queue): order detail always; bank instructions for bank
  // transfer; payment confirmation for instantly-paid methods.
  await sendOrderConfirmation(order);
  if (isBank) await sendBankInstructions(order);
  else if (simulatedPaid) await sendStatusEmail(order, 'awaiting_shipment');

  res.status(201).json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal,
      shippingFee,
      total,
    },
  });
});

module.exports = { calculateTotals, placeOrder, placeOrderSchema, computeTotals };
