const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler, badRequest, notFound } = require('../utils/http');
const { getOrCreateCart, serializeCart } = require('../services/cart');

const addSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1),
});

const updateSchema = z.object({
  quantity: z.coerce.number().int().min(0),
});

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req, res);
  res.json(await serializeCart(cart.id));
});

// POST /api/cart/items
const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== 'active') throw notFound('Product not available');
  if (product.stock < quantity) throw badRequest('Not enough stock');

  const cart = await getOrCreateCart(req, res);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, productId, quantity },
  });
  res.status(201).json(await serializeCart(cart.id));
});

// PATCH /api/cart/items/:itemId
const updateItem = asyncHandler(async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req, res);
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { product: true } });
  if (!item) throw notFound('Cart item not found');

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (item.product.stock < quantity) throw badRequest('Not enough stock');
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }
  res.json(await serializeCart(cart.id));
});

// DELETE /api/cart/items/:itemId
const removeItem = asyncHandler(async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const cart = await getOrCreateCart(req, res);
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) throw notFound('Cart item not found');
  await prisma.cartItem.delete({ where: { id: item.id } });
  res.json(await serializeCart(cart.id));
});

module.exports = { getCart, addItem, updateItem, removeItem, addSchema, updateSchema };
