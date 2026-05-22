const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');

// GET /api/admin/email-logs
const emailLogs = asyncHandler(async (req, res) => {
  const { status, page = '1', limit = '30' } = req.query;
  const take = Math.min(parseInt(limit, 10) || 30, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = status ? { status } : {};
  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({ where, orderBy: { id: 'desc' }, skip, take }),
    prisma.emailLog.count({ where }),
  ]);
  res.json({ logs, total, page: parseInt(page, 10) || 1, totalPages: Math.ceil(total / take) });
});

// GET /api/admin/stats  — dashboard overview
const stats = asyncHandler(async (req, res) => {
  const [productCount, orderCount, customerCount, pending, revenueAgg, recentOrders, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: { name: 'customer' } } }),
    prisma.order.count({ where: { status: 'pending' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ['paid', 'shipped', 'delivered'] } } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { payment: true } }),
    prisma.product.findMany({ where: { stock: { lte: 5 } }, orderBy: { stock: 'asc' }, take: 5 }),
  ]);

  res.json({
    productCount,
    orderCount,
    customerCount,
    pendingOrders: pending,
    revenue: Number(revenueAgg._sum.total || 0),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
      paymentStatus: o.payment?.status,
    })),
    lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock })),
  });
});

module.exports = { emailLogs, stats };
