const { nanoid } = require('nanoid');
const prisma = require('../lib/prisma');

const GUEST_COOKIE = 'cart_token';

// Resolve the active cart for a request. Logged-in users get their user cart;
// guests get a cart keyed by a cookie token (created on demand).
async function getOrCreateCart(req, res) {
  if (req.user) {
    let cart = await prisma.cart.findFirst({ where: { userId: req.user.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user.id } });
    // Merge a guest cart into the user cart on login, if present.
    const guestToken = req.cookies?.[GUEST_COOKIE];
    if (guestToken) {
      const guestCart = await prisma.cart.findUnique({ where: { token: guestToken }, include: { items: true } });
      if (guestCart && guestCart.id !== cart.id) {
        for (const item of guestCart.items) {
          // eslint-disable-next-line no-await-in-loop
          await prisma.cartItem.upsert({
            where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
            update: { quantity: { increment: item.quantity } },
            create: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
          });
        }
        await prisma.cart.delete({ where: { id: guestCart.id } });
        if (res) res.clearCookie(GUEST_COOKIE);
      }
    }
    return cart;
  }

  // Guest path
  let token = req.cookies?.[GUEST_COOKIE];
  let cart = token ? await prisma.cart.findUnique({ where: { token } }) : null;
  if (!cart) {
    token = nanoid();
    cart = await prisma.cart.create({ data: { token } });
    if (res) {
      res.cookie(GUEST_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    }
  }
  return cart;
}

function priceOf(product) {
  return Number(product.discountPrice ?? product.price);
}

async function serializeCart(cartId) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } },
    orderBy: { id: 'asc' },
  });
  const lines = items.map((it) => {
    const unit = priceOf(it.product);
    return {
      id: it.id,
      productId: it.productId,
      name: it.product.name,
      slug: it.product.slug,
      sku: it.product.sku,
      rarity: it.product.rarity,
      artVariant: it.product.artVariant,
      image: it.product.images[0]?.url || null,
      unitPrice: unit,
      quantity: it.quantity,
      lineTotal: +(unit * it.quantity).toFixed(2),
      stock: it.product.stock,
    };
  });
  const subtotal = +lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { cartId, items: lines, subtotal, count };
}

module.exports = { getOrCreateCart, serializeCart, priceOf, GUEST_COOKIE };
