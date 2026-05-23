const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/http');

// GET /api/shipping-methods  — enabled methods for checkout
const shippingMethods = asyncHandler(async (req, res) => {
  const methods = await prisma.shippingMethod.findMany({ where: { enabled: true }, orderBy: { fee: 'asc' } });
  res.json({
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      fee: Number(m.fee),
      zone: m.zone,
      estimate: m.estimate,
    })),
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

module.exports = { shippingMethods, paymentMethods };
