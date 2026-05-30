const prisma = require('../lib/prisma');
const { ApiError } = require('../utils/http');

// Validate a discount code against (subtotal, userId) and compute the discount.
// Returns { code, amount }. Throws ApiError with status 400/404 on failure.
async function validateAndCompute(rawCode, subtotal, userId) {
  if (!rawCode) throw new ApiError(400, 'No discount code provided');
  const code = await prisma.discountCode.findUnique({
    where: { code: String(rawCode).toUpperCase().trim() },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!code || !code.enabled) throw new ApiError(404, 'Invalid discount code');

  const now = new Date();
  if (code.validFrom && now < code.validFrom) throw new ApiError(400, 'This code is not yet active');
  if (code.validUntil && now > code.validUntil) throw new ApiError(400, 'This discount code has expired');
  if (code.userId && code.userId !== userId) throw new ApiError(400, 'This code is not valid for your account');
  if (code.usageLimit && code._count.redemptions >= code.usageLimit) {
    throw new ApiError(400, 'This code has reached its usage limit');
  }
  if (code.perUserLimit && userId) {
    const userUses = await prisma.discountRedemption.count({ where: { codeId: code.id, userId } });
    if (userUses >= code.perUserLimit) throw new ApiError(400, "You've already used this code");
  }
  const min = Number(code.minSubtotal);
  if (min > 0 && subtotal < min) {
    throw new ApiError(400, `Minimum order of ฿${min.toFixed(2)} required for this code`);
  }

  let amount;
  if (code.type === 'percent') {
    amount = subtotal * (Number(code.value) / 100);
  } else {
    amount = Number(code.value);
  }
  amount = Math.min(amount, subtotal); // never exceed subtotal
  amount = +amount.toFixed(2);
  return { code, amount };
}

async function recordRedemption(codeId, userId, orderId, amount) {
  await prisma.$transaction([
    prisma.discountRedemption.create({ data: { codeId, userId: userId || null, orderId: orderId || null, amount } }),
    prisma.discountCode.update({ where: { id: codeId }, data: { usedCount: { increment: 1 } } }),
  ]);
}

module.exports = { validateAndCompute, recordRedemption };
