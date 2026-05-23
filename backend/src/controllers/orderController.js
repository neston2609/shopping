const prisma = require('../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../utils/http');
const { publicPath } = require('../lib/upload');
const { sendAdminPaymentReview } = require('../services/orderEmails');

function serialize(o) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    subtotal: Number(o.subtotal),
    shippingFee: Number(o.shippingFee),
    total: Number(o.total),
    trackingNumber: o.trackingNumber,
    customerEmail: o.customerEmail,
    createdAt: o.createdAt,
    shipping: {
      name: o.shipName,
      phone: o.shipPhone,
      line1: o.shipLine1,
      line2: o.shipLine2,
      city: o.shipCity,
      state: o.shipState,
      postalCode: o.shipPostalCode,
      country: o.shipCountry,
      method: o.shippingMethod ? { id: o.shippingMethod.id, name: o.shippingMethod.name } : null,
    },
    payment: o.payment
      ? {
          method: o.payment.method,
          status: o.payment.status,
          transactionId: o.payment.transactionId,
          slipUrl: o.payment.slipUrl || null,
          slipUploadedAt: o.payment.slipUploadedAt || null,
          payerNote: o.payment.payerNote || null,
        }
      : null,
    items: (o.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
    })),
  };
}

// GET /api/orders  — current user's order history
const myOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { items: true, payment: true, shippingMethod: true },
  });
  res.json({ orders: orders.map(serialize) });
});

// GET /api/orders/:orderNumber
const myOrderDetail = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber: req.params.orderNumber, userId: req.user.id },
    include: { items: true, payment: true, shippingMethod: true },
  });
  if (!order) throw notFound('Order not found');
  res.json({ order: serialize(order) });
});

// GET /api/orders/lookup/:orderNumber  — public (by unguessable order number).
// Used by the order-confirmation page (works for guests + on refresh).
const publicLookup = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    include: { items: true, payment: true },
  });
  if (!order) throw notFound('Order not found');

  let bank = null;
  if (order.payment?.method === 'bank_transfer') {
    const cfg = await prisma.paymentMethodConfig.findUnique({ where: { method: 'bank_transfer' } });
    if (cfg) {
      bank = {
        bankName: cfg.bankName,
        bankAccountName: cfg.bankAccountName,
        bankAccountNumber: cfg.bankAccountNumber,
        bankBranch: cfg.bankBranch,
        bankInstructions: cfg.bankInstructions,
        qrImageUrl: cfg.qrImageUrl,
      };
    }
  }

  res.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      createdAt: order.createdAt,
      trackingNumber: order.trackingNumber,
      paymentMethod: order.payment?.method || null,
      paymentStatus: order.payment?.status || null,
      slipUrl: order.payment?.slipUrl || null,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, lineTotal: Number(i.lineTotal) })),
      bank,
    },
  });
});

// POST /api/orders/:orderNumber/slip  — customer uploads payment slip (multipart "slip").
const uploadSlip = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Payment slip image is required');
  const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber }, include: { payment: true, items: true } });
  if (!order || !order.payment) throw notFound('Order not found');
  if (order.payment.method !== 'bank_transfer') throw badRequest('This order is not paying by bank transfer');
  if (!['awaiting_payment', 'payment_review'].includes(order.status)) {
    throw badRequest('A slip cannot be uploaded for this order anymore');
  }

  const slipUrl = publicPath('slips', req.file.filename);
  await prisma.payment.update({
    where: { id: order.payment.id },
    data: { slipUrl, slipUploadedAt: new Date(), status: 'submitted', payerNote: req.body.payerNote || null },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: 'payment_review' } });

  // Notify admins with the slip + payment info.
  const fresh = await prisma.order.findUnique({ where: { id: order.id }, include: { payment: true, items: true } });
  await sendAdminPaymentReview(fresh, fresh.payment);

  res.status(201).json({ ok: true, slipUrl, status: 'payment_review' });
});

module.exports = { myOrders, myOrderDetail, serialize, publicLookup, uploadSlip };
