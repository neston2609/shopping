const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../utils/http');
const { serialize } = require('../productController');
const { publicPath } = require('../../lib/upload');

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const imageSchema = z.object({ url: z.string().min(1), alt: z.string().optional(), position: z.coerce.number().int().default(0) });
const attrSchema = z.object({ name: z.string().min(1), value: z.string().min(1) });

const upsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  sku: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  discountPrice: z.coerce.number().nonnegative().nullable().optional(),
  shippingFee: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).default('common'),
  platform: z.string().optional(),
  artVariant: z.string().optional(),
  youtubeUrl: z.string().optional().or(z.literal('')),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  images: z.array(imageSchema).optional(),
  attributes: z.array(attrSchema).optional(),
});

// GET /api/admin/products
const list = asyncHandler(async (req, res) => {
  const { q, page = '1', limit = '20' } = req.query;
  const take = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true } }),
    prisma.product.count({ where }),
  ]);
  res.json({ items: items.map(serialize), total, page: parseInt(page, 10) || 1, totalPages: Math.ceil(total / take) });
});

const getOne = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
  });
  if (!product) throw notFound('Product not found');
  res.json({ product: serialize(product) });
});

const create = asyncHandler(async (req, res) => {
  const data = req.body;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      sku: data.sku,
      price: data.price,
      discountPrice: data.discountPrice ?? null,
      shippingFee: data.shippingFee ?? null,
      stock: data.stock,
      status: data.status,
      rarity: data.rarity,
      platform: data.platform,
      artVariant: data.artVariant,
      youtubeUrl: data.youtubeUrl || null,
      categoryId: data.categoryId ?? null,
      images: data.images ? { create: data.images } : undefined,
      attributes: data.attributes ? { create: data.attributes } : undefined,
    },
    include: { category: true, images: true, attributes: true },
  });
  res.status(201).json({ product: serialize(product) });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Product not found');

  const product = await prisma.$transaction(async (tx) => {
    if (data.images) {
      await tx.productImage.deleteMany({ where: { productId: id } });
    }
    if (data.attributes) {
      await tx.productAttribute.deleteMany({ where: { productId: id } });
    }
    return tx.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug ? slugify(data.slug) : undefined,
        description: data.description,
        sku: data.sku,
        price: data.price,
        discountPrice: data.discountPrice ?? null,
        shippingFee: data.shippingFee ?? null,
        stock: data.stock,
        status: data.status,
        rarity: data.rarity,
        platform: data.platform,
        artVariant: data.artVariant,
        youtubeUrl: data.youtubeUrl || null,
        categoryId: data.categoryId ?? null,
        images: data.images ? { create: data.images } : undefined,
        attributes: data.attributes ? { create: data.attributes } : undefined,
      },
      include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
    });
  });
  res.json({ product: serialize(product) });
});

// POST /api/admin/products/:id/images  — multipart "image", appends a new image
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Image is required');
  const id = parseInt(req.params.id, 10);
  const count = await prisma.productImage.count({ where: { productId: id } });
  const url = publicPath('products', req.file.filename);
  await prisma.productImage.create({ data: { productId: id, url, position: count } });
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
  });
  res.json({ product: serialize(product) });
});

// DELETE /api/admin/products/:id/images/:imageId
const removeImage = asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const imageId = parseInt(req.params.imageId, 10);
  await prisma.productImage.delete({ where: { id: imageId } });
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, images: { orderBy: { position: 'asc' } }, attributes: true },
  });
  res.json({ product: serialize(product) });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = { list, getOne, create, update, remove, uploadImage, removeImage, upsertSchema, slugify };
