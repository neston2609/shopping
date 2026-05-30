const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');

const upsertSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  enabled: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

function serialize(r) {
  return { id: r.id, pattern: r.pattern, enabled: r.enabled, position: r.position };
}

const list = asyncHandler(async (req, res) => {
  const rules = await prisma.downloadHideRule.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  res.json({ rules: rules.map(serialize) });
});

const create = asyncHandler(async (req, res) => {
  const r = await prisma.downloadHideRule.create({
    data: { pattern: req.body.pattern, enabled: req.body.enabled ?? true, position: req.body.position ?? 0 },
  });
  res.status(201).json({ rule: serialize(r) });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = await prisma.downloadHideRule.update({
    where: { id },
    data: { pattern: req.body.pattern, enabled: req.body.enabled, position: req.body.position },
  });
  res.json({ rule: serialize(r) });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.downloadHideRule.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, upsertSchema };
