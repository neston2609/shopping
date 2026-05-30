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

// ---------- Shipping promo (singleton) ----------
async function getPromoRow() {
  let row = await prisma.shippingPromo.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.shippingPromo.create({ data: {} });
  return row;
}

function publicPromo(row) {
  return {
    freeShippingEnabled: row.freeShippingEnabled,
    freeShippingThreshold: Number(row.freeShippingThreshold),
  };
}

const promoSchema = z.object({
  freeShippingEnabled: z.boolean(),
  freeShippingThreshold: z.coerce.number().nonnegative(),
});

const getPromo = asyncHandler(async (req, res) => {
  res.json({ promo: publicPromo(await getPromoRow()) });
});

const updatePromo = asyncHandler(async (req, res) => {
  const row = await getPromoRow();
  const saved = await prisma.shippingPromo.update({
    where: { id: row.id },
    data: {
      freeShippingEnabled: req.body.freeShippingEnabled,
      freeShippingThreshold: req.body.freeShippingThreshold,
    },
  });
  res.json({ promo: publicPromo(saved) });
});

module.exports = { list, create, update, remove, upsertSchema, getPromo, updatePromo, promoSchema };
