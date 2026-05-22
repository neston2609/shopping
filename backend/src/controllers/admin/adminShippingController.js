const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');

const upsertSchema = z.object({
  name: z.string().min(1),
  fee: z.coerce.number().nonnegative().default(0),
  zone: z.string().optional(),
  estimate: z.string().optional(),
  enabled: z.boolean().default(true),
});

const list = asyncHandler(async (req, res) => {
  const methods = await prisma.shippingMethod.findMany({ orderBy: { id: 'asc' } });
  res.json({ methods: methods.map((m) => ({ ...m, fee: Number(m.fee) })) });
});

const create = asyncHandler(async (req, res) => {
  const method = await prisma.shippingMethod.create({ data: req.body });
  res.status(201).json({ method: { ...method, fee: Number(method.fee) } });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const method = await prisma.shippingMethod.update({ where: { id }, data: req.body });
  res.json({ method: { ...method, fee: Number(method.fee) } });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.shippingMethod.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, upsertSchema };
