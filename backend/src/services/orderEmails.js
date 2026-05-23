const { queueTemplateEmail } = require('../lib/mailer');

const STATUS_TEMPLATE = {
  paid: 'payment_confirmation',
  shipped: 'order_shipped',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
};

function money(n) {
  return `฿${Number(n).toFixed(2)}`;
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
  const key = status === 'pending' ? 'order_confirmation' : STATUS_TEMPLATE[status];
  if (!key) return;
  await queueTemplateEmail(key, { to: order.customerEmail, orderId: order.id, vars: buildVars(order) });
}

async function sendOrderConfirmation(order) {
  await queueTemplateEmail('order_confirmation', { to: order.customerEmail, orderId: order.id, vars: buildVars(order) });
}

module.exports = { buildVars, sendStatusEmail, sendOrderConfirmation, STATUS_TEMPLATE };
