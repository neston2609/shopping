/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const env = require('../src/config/env');
const { encrypt } = require('../src/lib/crypto');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Retro email template bodies (HTML with {{variables}})
// ---------------------------------------------------------------------------
function shell(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#0d0420;font-family:'Courier New',monospace;color:#f6f1ff;padding:24px">
  <div style="max-width:600px;margin:0 auto;border:4px solid #ff2e88;background:#1a0b2e;padding:24px">
    <div style="font-size:18px;color:#22d3ff;letter-spacing:2px;border-bottom:3px dashed #2a1450;padding-bottom:12px;margin-bottom:16px">▶ RETROCONSOLE 1981</div>
    <h1 style="font-size:20px;color:#ffcb3c;text-transform:uppercase">${title}</h1>
    ${inner}
    <div style="margin-top:24px;border-top:2px dashed #2a1450;padding-top:12px;font-size:12px;color:#b9a8e0">▲▲▼▼◀▶◀▶ B A START — THANKS FOR PLAYING</div>
  </div></body></html>`;
}

const TEMPLATES = [
  {
    key: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Quest Accepted — Order {{order_id}} confirmed',
    body: shell('Order Confirmed', `<p>Hi {{customer_name}},</p>
      <p>Your order <b style="color:#a3ff3c">{{order_id}}</b> has been received and is now in the queue.</p>
      <p><b style="color:#22d3ff">ITEMS</b><br/>{{order_items}}</p>
      <p><b style="color:#22d3ff">TOTAL</b> {{order_total}}</p>
      <p><b style="color:#22d3ff">SHIP TO</b> {{shipping_address}}</p>`),
  },
  {
    key: 'payment_confirmation',
    name: 'Payment Confirmation',
    subject: 'Coins Received — Payment for {{order_id}}',
    body: shell('Payment Received', `<p>Hi {{customer_name}},</p>
      <p>We received payment of <b style="color:#a3ff3c">{{order_total}}</b> for order <b>{{order_id}}</b>. Powering up your shipment now.</p>
      <p>{{order_items}}</p>`),
  },
  {
    key: 'order_shipped',
    name: 'Order Shipped',
    subject: 'Loot Incoming — {{order_id}} has shipped',
    body: shell('Order Shipped', `<p>Hi {{customer_name}},</p>
      <p>Order <b>{{order_id}}</b> is on its way!</p>
      <p><b style="color:#22d3ff">TRACKING</b> {{tracking_number}}</p>
      <p><b style="color:#22d3ff">SHIP TO</b> {{shipping_address}}</p>`),
  },
  {
    key: 'order_delivered',
    name: 'Order Delivered',
    subject: 'Stage Cleared — {{order_id}} delivered',
    body: shell('Order Delivered', `<p>Hi {{customer_name}},</p>
      <p>Order <b>{{order_id}}</b> has been delivered. GG! Hit any issue within 30 days and we'll respawn your order.</p>`),
  },
  {
    key: 'order_cancelled',
    name: 'Order Cancelled',
    subject: 'Game Over — {{order_id}} cancelled',
    body: shell('Order Cancelled', `<p>Hi {{customer_name}},</p>
      <p>Order <b>{{order_id}}</b> has been cancelled and any charge of {{order_total}} will be refunded.</p>`),
  },
];

const CATEGORIES = [
  { name: 'Consoles', glyph: 'CART', imageColor: '#ff2e88', description: 'Handhelds + home consoles' },
  { name: 'Controllers', glyph: 'PAD', imageColor: '#22d3ff', description: 'Wired + wireless pads' },
  { name: 'Games', glyph: 'CART', imageColor: '#a3ff3c', description: 'Sealed + loose cartridges' },
  { name: 'Accessories', glyph: 'GEAR', imageColor: '#ffcb3c', description: 'Cables + cases' },
  { name: 'CRT Monitors', glyph: 'CRT', imageColor: '#c47bff', description: '14"–32" tubes' },
  { name: 'Arcade Parts', glyph: 'FX', imageColor: '#ff7a1a', description: 'Sticks + buttons' },
  { name: 'Guides + Zines', glyph: 'BOOK', imageColor: '#22d3ff', description: 'Strategy lore' },
  { name: 'Apparel', glyph: 'WEAR', imageColor: '#ff2e88', description: 'Tees + plushies' },
];

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Products mirror the storefront design cards.
const PRODUCTS = [
  { name: 'Crystal Quest: Lords of Aether', sku: 'GAME-CQ-001', price: 229, discountPrice: 179, stock: 12, rarity: 'legendary', platform: 'SEGA-16 / 1992 / SEALED', artVariant: 'cart-mag', category: 'Games', attrs: [['edition', 'Sealed'], ['region', 'NTSC']], description: 'A landmark 16-bit action-RPG. Factory sealed, graded 9.4. Includes original poster insert.' },
  { name: 'CD-IX Disc Console + 2 Pads Bundle', sku: 'CON-CDIX-001', price: 249, stock: 7, rarity: 'rare', platform: 'CDIX / 1996 / REFURBISHED', artVariant: 'cart-cyn', category: 'Consoles', attrs: [['color', 'Cyan'], ['condition', 'Refurbished']], description: 'Recapped CD-IX disc console with two restored controllers and fresh laser assembly.' },
  { name: 'Pocket-Lime Handheld Restored Edition', sku: 'CON-PL-001', price: 79, discountPrice: 67, stock: 24, rarity: 'common', platform: 'POCKET-LIME / 1989 / TESTED', artVariant: 'cart-lim', category: 'Consoles', attrs: [['color', 'Lime'], ['battery', 'New cell']], description: 'The handheld that started it all, fully tested with a new screen lens and grippy shell.' },
  { name: 'Dragon Summit IV: Realm of Embers', sku: 'GAME-DS4-001', price: 129, stock: 9, rarity: 'epic', platform: 'NEON-64 / 1998 / CIB', artVariant: 'cart-gld', category: 'Games', attrs: [['edition', 'CIB'], ['region', 'PAL']], description: 'Complete-in-box JRPG epic with map, manual and registration card intact.' },
  { name: 'Spectrum Runner Special Edition', sku: 'GAME-SR-001', price: 89, stock: 15, rarity: 'epic', platform: 'SEGA-16 / 1994 / LOOSE', artVariant: 'cart-pur', category: 'Games', attrs: [['edition', 'Special'], ['condition', 'Loose']], description: 'High-speed side-scroller, special edition purple shell. Cartridge cleaned and tested.' },
  { name: 'Knockout Boulevard Classic Cart', sku: 'GAME-KB-001', price: 49, discountPrice: 34, stock: 30, rarity: 'common', platform: '8-BIT FAM / 1987 / LOOSE', artVariant: 'cart-org', category: 'Games', attrs: [['condition', 'Loose']], description: 'Classic 8-bit boxing brawler. A staple of any retro library.' },
  { name: 'Hyperpad Pro Magenta Edition', sku: 'CTRL-HP-001', price: 42, stock: 50, rarity: 'rare', platform: 'NEON-64 / NEW MFR / WIRED', artVariant: 'cart-mag', category: 'Controllers', attrs: [['color', 'Magenta'], ['connection', 'Wired']], description: 'Newly manufactured wired controller with low-latency d-pad and turbo function.' },
  { name: 'Aqua-X SuperDrive Anniversary Boxed', sku: 'CON-AX-001', price: 429, stock: 4, rarity: 'legendary', platform: 'AQUA-X / 1995 / IN BOX', artVariant: 'cart-cyn', category: 'Consoles', attrs: [['edition', 'Anniversary'], ['condition', 'In box']], description: 'Numbered anniversary edition in original foam-lined arcade box. Collector grade.' },
  { name: 'Neon Drifter 1996 Sealed', sku: 'GAME-ND-001', price: 59, discountPrice: 34, stock: 18, rarity: 'rare', platform: 'NEON-64 / 1996 / SEALED', artVariant: 'cart-cyn', category: 'Games', attrs: [['condition', 'Sealed']], description: 'Sealed neon racer. A daily-deal favorite.' },
  { name: 'Goldpad Wireless Boxed New', sku: 'CTRL-GP-001', price: 79, discountPrice: 58, stock: 22, rarity: 'rare', platform: 'NEON-64 / NEW / WIRELESS', artVariant: 'cart-gld', category: 'Controllers', attrs: [['color', 'Gold'], ['connection', 'Wireless']], description: 'Boxed wireless gamepad with gold shell and rechargeable pack.' },
  { name: 'Trinitron 14" Refurbished', sku: 'CRT-TR14-001', price: 240, discountPrice: 160, stock: 6, rarity: 'epic', platform: 'CRT / 14" / REFURBISHED', artVariant: 'cart-pur', category: 'CRT Monitors', attrs: [['size', '14 inch'], ['input', 'Composite + RGB']], description: 'Crisp 14-inch Trinitron tube, recapped and calibrated for retro consoles.' },
  { name: 'PIXEL ZINE Vol.4 Strategy Issue', sku: 'ZINE-PX4-001', price: 18, discountPrice: 9, stock: 100, rarity: 'common', platform: 'ZINE / PRINT', artVariant: 'cart-cyn', category: 'Guides + Zines', attrs: [['format', 'Print']], description: 'Fan-made strategy zine, 48 full-color pages of maps and lore.' },
];

const SHIPPING_METHODS = [
  { name: 'Standard Shipping', fee: 6.99, zone: 'Domestic', estimate: '3-5 days', enabled: true },
  { name: 'Express Shipping', fee: 14.99, zone: 'Domestic', estimate: '1-2 days', enabled: true },
  { name: 'Worldwide Quest', fee: 24.99, zone: 'Worldwide', estimate: '7-14 days', enabled: true },
];

const PAYMENT_METHODS = [
  { method: 'card', label: 'Credit / Debit Card', enabled: true },
  { method: 'stripe', label: 'Stripe', enabled: true },
  { method: 'paypal', label: 'PayPal', enabled: true },
  { method: 'cod', label: 'Cash on Delivery', enabled: true },
];

async function main() {
  console.log('▶ Seeding RETROCONSOLE 1981...');

  // Roles
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
  const customerRole = await prisma.role.upsert({ where: { name: 'customer' }, update: {}, create: { name: 'customer' } });

  // Admin user
  const adminHash = await bcrypt.hash(env.seed.adminPassword, 12);
  await prisma.user.upsert({
    where: { email: env.seed.adminEmail },
    update: { passwordHash: adminHash, roleId: adminRole.id },
    create: { email: env.seed.adminEmail, passwordHash: adminHash, firstName: 'Arcade', lastName: 'Admin', roleId: adminRole.id },
  });

  // Demo customer
  const custHash = await bcrypt.hash('Player1981!', 12);
  await prisma.user.upsert({
    where: { email: 'player1@retroconsole1981.gg' },
    update: {},
    create: { email: 'player1@retroconsole1981.gg', passwordHash: custHash, firstName: 'Player', lastName: 'One', coins: 2450, roleId: customerRole.id },
  });

  // Categories
  const catBySlug = {};
  for (const c of CATEGORIES) {
    const slug = slugify(c.name);
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { name: c.name, glyph: c.glyph, imageColor: c.imageColor, description: c.description },
      create: { name: c.name, slug, glyph: c.glyph, imageColor: c.imageColor, description: c.description },
    });
    catBySlug[c.name] = cat;
  }

  // Products
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const cat = catBySlug[p.category];
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name, slug, description: p.description, price: p.price, discountPrice: p.discountPrice ?? null,
        stock: p.stock, rarity: p.rarity, platform: p.platform, artVariant: p.artVariant, status: 'active',
        categoryId: cat?.id ?? null,
      },
      create: {
        name: p.name, slug, sku: p.sku, description: p.description, price: p.price, discountPrice: p.discountPrice ?? null,
        stock: p.stock, rarity: p.rarity, platform: p.platform, artVariant: p.artVariant, status: 'active',
        categoryId: cat?.id ?? null,
        attributes: { create: (p.attrs || []).map(([name, value]) => ({ name, value })) },
      },
    });
  }

  // Shipping methods
  for (const m of SHIPPING_METHODS) {
    const existing = await prisma.shippingMethod.findFirst({ where: { name: m.name } });
    if (existing) await prisma.shippingMethod.update({ where: { id: existing.id }, data: m });
    else await prisma.shippingMethod.create({ data: m });
  }

  // Payment methods
  for (const pm of PAYMENT_METHODS) {
    await prisma.paymentMethodConfig.upsert({ where: { method: pm.method }, update: { label: pm.label, enabled: pm.enabled }, create: pm });
  }

  // SMTP settings (single row), seeded from env
  const existingSmtp = await prisma.smtpSettings.findFirst();
  const smtpData = {
    host: env.smtp.host,
    port: env.smtp.port,
    username: env.smtp.user || null,
    passwordEnc: env.smtp.password ? encrypt(env.smtp.password) : null,
    encryptionType: env.smtp.encryption,
    senderEmail: env.smtp.senderEmail,
    senderName: env.smtp.senderName,
    provider: 'gmail',
    enabled: !!(env.smtp.user && env.smtp.password),
  };
  if (existingSmtp) await prisma.smtpSettings.update({ where: { id: existingSmtp.id }, data: smtpData });
  else await prisma.smtpSettings.create({ data: smtpData });

  // Email templates
  for (const t of TEMPLATES) {
    await prisma.emailTemplate.upsert({ where: { key: t.key }, update: { name: t.name, subject: t.subject, body: t.body }, create: t });
  }

  console.log('✓ Seed complete.');
  console.log(`  Admin login:    ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  console.log('  Customer login: player1@retroconsole1981.gg / Player1981!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
