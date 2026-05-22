const prisma = require('../lib/prisma');
const { asyncHandler, notFound } = require('../utils/http');

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
    payment: o.payment ? { method: o.payment.method, status: o.payment.status, transactionId: o.payment.transactionId } : null,
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

module.exports = { myOrders, myOrderDetail, serialize };
