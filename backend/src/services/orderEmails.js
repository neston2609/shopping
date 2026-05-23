const prisma = require('../lib/prisma');
const env = require('../config/env');
const { queueTemplateEmail } = require('../lib/mailer');

// Order status -> customer email template.
const STATUS_TEMPLATE = {
  awaiting_shipment: 'payment_confirmation', // payment approved/received
  shipped: 'order_shipped',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
};

function money(n) {
  return `฿${Number(n).toFixed(2)}`;
}

function absUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  return `${env.publicUrl.replace(/\/$/, '')}${p}`;
}

function buildVars(order) {
  const itemsText = (order.items || [])
    .map((i) => `${i.quantity}x ${i.name} — ${money(i.lineTotal)}`)
    .join('<br/>');
  const address = [order.shipName, order.shipLine1, order.shipLine2, `${order.shipCity || ''} ${order.shipState || ''} ${order.shipPostalCode || ''}`.trim(), order.shipCountry]
    .filter(Boolean)
    .join(', ');
  return {
    customer_name: order.shipName || order.customerEmail,
    order_id: order.orderNumber,
    order_total: money(order.total),
    order_items: itemsText,
    shipping_address: address,
    tracking_number: order.trackingNumber || 'N/A',
  };
}

// Queue the customer email appropriate for an order's current status.
async function sendStatusEmail(order, statusOverride) {
  const status = statusOverride || order.status;
  const key = status === 'awaiting_payment' ? 'order_confirmation' : STATUS_TEMPLATE[status];
  if (!key) return;
  await queueTemplateEmail(key, { to: order.customerEmail, orderId: order.id, vars: buildVars(order) });
}

async function sendOrderConfirmation(order) {
  await queueTemplateEmail('order_confirmation', { to: order.customerEmail, orderId: order.id, vars: buildVars(order) });
}

// Bank-transfer payment instructions (bank account + QR) sent right after a
// bank-transfer order is placed.
async function sendBankInstructions(order) {
  const cfg = await prisma.paymentMethodConfig.findUnique({ where: { method: 'bank_transfer' } });
  if (!cfg) return;
  await queueTemplateEmail('bank_transfer_instructions', {
    to: order.customerEmail,
    orderId: order.id,
    vars: {
      ...buildVars(order),
      bank_name: cfg.bankName || '',
      bank_account_name: cfg.bankAccountName || '',
      bank_account_number: cfg.bankAccountNumber || '',
      bank_branch: cfg.bankBranch || '',
      bank_instructions: cfg.bankInstructions || '',
      qr_url: absUrl(cfg.qrImageUrl),
    },
  });
}

// Notify all admins that a customer uploaded a payment slip awaiting review.
async function sendAdminPaymentReview(order, payment) {
  const admins = await prisma.user.findMany({ where: { role: { name: 'admin' }, isActive: true } });
  const vars = {
    ...buildVars(order),
    customer_email: order.customerEmail,
    payer_note: payment.payerNote || '-',
    slip_url: absUrl(payment.slipUrl),
  };
  for (const a of admins) {
    // eslint-disable-next-line no-await-in-loop
    await queueTemplateEmail('admin_payment_review', { to: a.email, orderId: order.id, vars });
  }
}

module.exports = { buildVars, sendStatusEmail, sendOrderConfirmation, sendBankInstructions, sendAdminPaymentReview, STATUS_TEMPLATE, money, absUrl };
