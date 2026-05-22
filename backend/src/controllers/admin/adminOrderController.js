const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../utils/http');
const { serialize } = require('../orderController');
const { sendStatusEmail } = require('../../services/orderEmails');

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
const trackingSchema = z.object({ trackingNumber: z.string().min(1) });
const paymentSchema = z.object({ status: z.enum(PAYMENT_STATUSES) });

const list = asyncHandler(async (req, res) => {
  const { status, q, page = '1', limit = '20' } = req.query;
  const take = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = {};
  if (status) where.status = status;
  if (q) where.OR = [{ orderNumber: { contains: q, mode: 'insensitive' } }, { customerEmail: { contains: q, mode: 'insensitive' } }];

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { items: true, payment: true, shippingMethod: true } }),
    prisma.order.count({ where }),
  ]);
  res.json({ orders: orders.map(serialize), total, page: parseInt(page, 10) || 1, totalPages: Math.ceil(total / take) });
});

const getOne = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { items: true, payment: true, shippingMethod: true, user: { include: { role: true } } },
  });
  if (!order) throw notFound('Order not found');
  res.json({ order: { ...serialize(order), user: order.user ? { id: order.user.id, email: order.user.email, name: [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') } : null } });
});

const updateStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!existing) throw notFound('Order not found');

  await prisma.$transaction(async (tx) => {
    // Restore stock when cancelling a non-cancelled order.
    if (status === 'cancelled' && existing.status !== 'cancelled') {
      for (const it of existing.items) {
        if (it.productId) {
          // eslint-disable-next-line no-await-in-loop
          await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
        }
      }
    }
    await tx.order.update({ where: { id }, data: { status } });
    // Keep payment in sync when marking paid.
    if (status === 'paid') {
      await tx.payment.updateMany({ where: { orderId: id }, data: { status: 'paid', paidAt: new Date() } });
    }
  });

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, payment: true, shippingMethod: true } });
  await sendStatusEmail(order, status);
  res.json({ order: serialize(order) });
});

const setTracking = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.update({ where: { id }, data: { trackingNumber: req.body.trackingNumber } });
  res.json({ ok: true, trackingNumber: order.trackingNumber });
});

const updatePayment = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
  if (!order || !order.payment) throw notFound('Payment not found');
  const data = { status: req.body.status };
  if (req.body.status === 'paid') data.paidAt = new Date();
  await prisma.payment.update({ where: { id: order.payment.id }, data });
  res.json({ ok: true });
});

module.exports = { list, getOne, updateStatus, setTracking, updatePayment, statusSchema, trackingSchema, paymentSchema };
