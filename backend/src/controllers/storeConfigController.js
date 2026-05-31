const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/http');

// GET /api/shipping-methods  — enabled methods + active promo
const shippingMethods = asyncHandler(async (req, res) => {
  const [methods, promo] = await Promise.all([
    prisma.shippingMethod.findMany({ where: { enabled: true }, orderBy: { fee: 'asc' } }),
    prisma.shippingPromo.findFirst({ orderBy: { id: 'asc' } }),
  ]);
  res.json({
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      fee: Number(m.fee),
      zone: m.zone,
      estimate: m.estimate,
    })),
    freeShipping: {
      enabled: !!promo?.freeShippingEnabled,
      threshold: promo ? Number(promo.freeShippingThreshold) : 0,
    },
  });
});

// GET /api/payment-methods  — enabled methods for checkout
const paymentMethods = asyncHandler(async (req, res) => {
  const methods = await prisma.paymentMethodConfig.findMany({ where: { enabled: true }, orderBy: { id: 'asc' } });
  res.json({
    methods: methods.map((m) => ({
      method: m.method,
      label: m.label,
      ...(m.method === 'bank_transfer'
        ? {
            bank: {
              bankName: m.bankName,
              bankAccountName: m.bankAccountName,
              bankAccountNumber: m.bankAccountNumber,
              bankBranch: m.bankBranch,
              bankInstructions: m.bankInstructions,
              qrImageUrl: m.qrImageUrl,
            },
          }
        : {}),
    })),
  });
});

// GET /api/store-settings — hero heading + subheading + LINE Chat embed snippet
// (public — used by the storefront to render dynamic copy and the chat bubble).
const storeSettings = asyncHandler(async (req, res) => {
  const row = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });
  res.json({
    heroHeading: row?.heroHeading || '',
    heroSubheading: row?.heroSubheading || '',
    lineChatEmbed: row?.lineChatEmbed || '',
    lineBasicId: row?.lineBasicId || '',
  });
});

module.exports = { shippingMethods, paymentMethods, storeSettings };
