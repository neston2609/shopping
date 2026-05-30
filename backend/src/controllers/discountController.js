const { z } = require('zod');
const { asyncHandler } = require('../utils/http');
const { validateAndCompute } = require('../services/discount');

const validateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number().nonnegative(),
});

// POST /api/discount/validate  — check a code against the cart subtotal
const validate = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const { code: row, amount } = await validateAndCompute(code, subtotal, req.user?.id || null);
  res.json({
    ok: true,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    minSubtotal: Number(row.minSubtotal),
    discount: amount,
  });
});

module.exports = { validate, validateSchema };
