const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../utils/http');
const { slugify } = require('./adminProductController');

const upsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageColor: z.string().optional(),
  glyph: z.string().optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

const list = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { products: true } }, parent: true },
  });
  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageColor: c.imageColor,
      glyph: c.glyph,
      parentId: c.parentId,
      parentName: c.parent?.name || null,
      productCount: c._count.products,
    })),
  });
});

const create = asyncHandler(async (req, res) => {
  const data = req.body;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const category = await prisma.category.create({ data: { ...data, slug, parentId: data.parentId ?? null } });
  res.status(201).json({ category });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  if (data.parentId === id) throw badRequest('A category cannot be its own parent');
  const category = await prisma.category.update({
    where: { id },
    data: { ...data, slug: data.slug ? slugify(data.slug) : undefined, parentId: data.parentId ?? null },
  });
  res.json({ category });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, upsertSchema };
