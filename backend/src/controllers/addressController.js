const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler, notFound } = require('../utils/http');

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean().optional(),
});

const list = asyncHandler(async (req, res) => {
  const addresses = await prisma.shippingAddress.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
  });
  res.json({ addresses });
});

const create = asyncHandler(async (req, res) => {
  const data = req.body;
  if (data.isDefault) {
    await prisma.shippingAddress.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  }
  const address = await prisma.shippingAddress.create({ data: { ...data, userId: req.user.id } });
  res.status(201).json({ address });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.shippingAddress.findFirst({ where: { id, userId: req.user.id } });
  if (!existing) throw notFound('Address not found');
  if (req.body.isDefault) {
    await prisma.shippingAddress.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  }
  const address = await prisma.shippingAddress.update({ where: { id }, data: req.body });
  res.json({ address });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.shippingAddress.findFirst({ where: { id, userId: req.user.id } });
  if (!existing) throw notFound('Address not found');
  await prisma.shippingAddress.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, addressSchema };
