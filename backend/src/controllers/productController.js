const prisma = require('../lib/prisma');
const { asyncHandler, notFound } = require('../utils/http');

function serialize(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    sku: p.sku,
    price: Number(p.price),
    discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
    shippingFee: p.shippingFee != null ? Number(p.shippingFee) : null,
    stock: p.stock,
    status: p.status,
    rarity: p.rarity,
    platform: p.platform,
    artVariant: p.artVariant,
    youtubeUrl: p.youtubeUrl || null,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    images: (p.images || []).map((i) => ({ id: i.id, url: i.url, alt: i.alt, position: i.position })),
    attributes: (p.attributes || []).map((a) => ({ id: a.id, name: a.name, value: a.value })),
  };
}

// GET /api/products  — list with search, filtering, sorting, pagination
const list = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    rarity,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = '1',
    limit = '12',
  } = req.query;

  const take = Math.min(parseInt(limit, 10) || 12, 60);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = { status: 'active' };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = { slug: category };
  if (rarity) where.rarity = rarity;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  const orderBy =
    sort === 'price_asc'
      ? { price: 'asc' }
      : sort === 'price_desc'
      ? { price: 'desc' }
      : sort === 'name'
      ? { name: 'asc' }
      : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    items: items.map(serialize),
    page: parseInt(page, 10) || 1,
    limit: take,
    total,
    totalPages: Math.ceil(total / take),
  });
});

// GET /api/products/:slug
const getBySlug = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
  });
  if (!product) throw notFound('Product not found');
  res.json({ product: serialize(product) });
});

// GET /api/products/featured
const featured = asyncHandler(async (req, res) => {
  const items = await prisma.product.findMany({
    where: { status: 'active' },
    orderBy: [{ rarity: 'desc' }, { createdAt: 'desc' }],
    take: 8,
    include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
  });
  res.json({ items: items.map(serialize) });
});

module.exports = { list, getBySlug, featured, serialize };
