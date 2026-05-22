const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/http');

function serialize(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageColor: c.imageColor,
    glyph: c.glyph,
    parentId: c.parentId,
    productCount: c._count?.products ?? undefined,
    children: c.children ? c.children.map(serialize) : [],
  };
}

// GET /api/categories  — returns the category tree (top-level with children)
const list = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { id: 'asc' },
    include: {
      _count: { select: { products: true } },
      children: { include: { _count: { select: { products: true } } }, orderBy: { id: 'asc' } },
    },
  });
  res.json({ categories: categories.map(serialize) });
});

module.exports = { list, serialize };
