// Shared domain constants used across backend, storefront, and admin dashboard.

const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const ORDER_STATUS_FLOW = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PAID,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
];

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const PAYMENT_METHOD = {
  CARD: 'card',
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  COD: 'cod',
};

const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

const ROLE = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

const EMAIL_TEMPLATE_KEYS = [
  'order_confirmation',
  'payment_confirmation',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
];

const EMAIL_STATUS = {
  SENT: 'sent',
  FAILED: 'failed',
  QUEUED: 'queued',
};

const SMTP_ENCRYPTION = {
  TLS: 'tls',
  SSL: 'ssl',
};

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PRODUCT_STATUS,
  RARITY,
  ROLE,
  EMAIL_TEMPLATE_KEYS,
  EMAIL_STATUS,
  SMTP_ENCRYPTION,
};
