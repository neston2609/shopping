const prisma = require('../../lib/prisma');
const { asyncHandler, notFound } = require('../../utils/http');

const list = asyncHandler(async (req, res) => {
  const { q, page = '1', limit = '20' } = req.query;
  const take = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = { role: { name: 'customer' } };
  if (q) where.OR = [{ email: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }];

  const [customers, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { _count: { select: { orders: true } } } }),
    prisma.user.count({ where }),
  ]);
  res.json({
    customers: customers.map((c) => ({
      id: c.id,
      email: c.email,
      name: [c.firstName, c.lastName].filter(Boolean).join(' '),
      phone: c.phone,
      coins: c.coins,
      orderCount: c._count.orders,
      isActive: c.isActive,
      createdAt: c.createdAt,
    })),
    total,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(total / take),
  });
});

const getOne = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: 'desc' }, include: { items: true, payment: true } },
    },
  });
  if (!customer) throw notFound('Customer not found');
  res.json({
    customer: {
      id: customer.id,
      email: customer.email,
      name: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
      phone: customer.phone,
      coins: customer.coins,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      addresses: customer.addresses,
      orders: customer.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        createdAt: o.createdAt,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        paymentStatus: o.payment?.status,
      })),
    },
  });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, getOne, remove };
