const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound } = require('../../utils/http');

const upsertSchema = z.object({
  code: z.string().min(2).max(40),
  description: z.string().optional().or(z.literal('')),
  type: z.enum(['percent', 'fixed']).default('percent'),
  value: z.coerce.number().positive(),
  minSubtotal: z.coerce.number().nonnegative().default(0),
  validFrom: z.string().optional().or(z.literal('')),
  validUntil: z.string().optional().or(z.literal('')),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perUserLimit: z.coerce.number().int().nonnegative().default(0),
  userId: z.coerce.number().int().positive().nullable().optional(),
  enabled: z.boolean().optional(),
});

function serialize(c) {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: Number(c.value),
    minSubtotal: Number(c.minSubtotal),
    validFrom: c.validFrom,
    validUntil: c.validUntil,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    userId: c.userId,
    enabled: c.enabled,
    createdAt: c.createdAt,
  };
}

const list = asyncHandler(async (req, res) => {
  const codes = await prisma.discountCode.findMany({ orderBy: { id: 'desc' }, include: { user: true } });
  res.json({
    codes: codes.map((c) => ({
      ...serialize(c),
      userEmail: c.user ? c.user.email : null,
    })),
  });
});

const create = asyncHandler(async (req, res) => {
  const data = req.body;
  const c = await prisma.discountCode.create({
    data: {
      code: data.code.toUpperCase().trim(),
      description: data.description || null,
      type: data.type,
      value: data.value,
      minSubtotal: data.minSubtotal ?? 0,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      usageLimit: data.usageLimit ?? null,
      perUserLimit: data.perUserLimit ?? 0,
      userId: data.userId ?? null,
      enabled: data.enabled ?? true,
    },
  });
  res.status(201).json({ code: serialize(c) });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  const c = await prisma.discountCode.update({
    where: { id },
    data: {
      code: data.code.toUpperCase().trim(),
      description: data.description || null,
      type: data.type,
      value: data.value,
      minSubtotal: data.minSubtotal ?? 0,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      usageLimit: data.usageLimit ?? null,
      perUserLimit: data.perUserLimit ?? 0,
      userId: data.userId ?? null,
      enabled: data.enabled ?? true,
    },
  });
  res.json({ code: serialize(c) });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.discountCode.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, upsertSchema, serialize };
