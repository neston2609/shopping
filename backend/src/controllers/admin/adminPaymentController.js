const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../utils/http');
const { encrypt, decrypt } = require('../../lib/crypto');
const { publicPath } = require('../../lib/upload');

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  // arbitrary key->value map of API credentials (e.g. publishableKey, secretKey)
  config: z.record(z.string()).optional(),
  // bank-transfer display info (public, shown to the customer)
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  bankInstructions: z.string().optional(),
});

function maskConfig(configEnc) {
  if (!configEnc) return {};
  const decrypted = decrypt(configEnc);
  if (!decrypted) return {};
  try {
    const obj = JSON.parse(decrypted);
    const masked = {};
    for (const [k, v] of Object.entries(obj)) {
      masked[k] = v ? `••••${String(v).slice(-4)}` : '';
    }
    return masked;
  } catch (e) {
    return {};
  }
}

function publicMethod(m) {
  return {
    id: m.id,
    method: m.method,
    label: m.label,
    enabled: m.enabled,
    config: maskConfig(m.configEnc),
    bankName: m.bankName || '',
    bankAccountName: m.bankAccountName || '',
    bankAccountNumber: m.bankAccountNumber || '',
    bankBranch: m.bankBranch || '',
    bankInstructions: m.bankInstructions || '',
    qrImageUrl: m.qrImageUrl || null,
  };
}

const list = asyncHandler(async (req, res) => {
  const methods = await prisma.paymentMethodConfig.findMany({ orderBy: { id: 'asc' } });
  res.json({ methods: methods.map(publicMethod) });
});

const update = asyncHandler(async (req, res) => {
  const method = req.params.method;
  const { label, enabled, config, bankName, bankAccountName, bankAccountNumber, bankBranch, bankInstructions } = req.body;

  const existing = await prisma.paymentMethodConfig.findUnique({ where: { method } });

  // Merge new config keys onto existing decrypted config (only overwrite provided keys).
  let configEnc = existing?.configEnc || null;
  if (config) {
    let current = {};
    if (existing?.configEnc) {
      try {
        current = JSON.parse(decrypt(existing.configEnc) || '{}');
      } catch (e) {
        current = {};
      }
    }
    configEnc = encrypt(JSON.stringify({ ...current, ...config }));
  }

  const bankPatch = {};
  if (bankName !== undefined) bankPatch.bankName = bankName;
  if (bankAccountName !== undefined) bankPatch.bankAccountName = bankAccountName;
  if (bankAccountNumber !== undefined) bankPatch.bankAccountNumber = bankAccountNumber;
  if (bankBranch !== undefined) bankPatch.bankBranch = bankBranch;
  if (bankInstructions !== undefined) bankPatch.bankInstructions = bankInstructions;

  const saved = await prisma.paymentMethodConfig.upsert({
    where: { method },
    update: { label: label ?? existing?.label, enabled: enabled ?? existing?.enabled, configEnc, ...bankPatch },
    create: { method, label: label || method, enabled: enabled ?? false, configEnc, ...bankPatch },
  });

  res.json({ method: publicMethod(saved) });
});

// POST /api/admin/payments/:method/qr  — upload QR image (multipart "qr"); bank_transfer only.
const uploadQr = asyncHandler(async (req, res) => {
  const method = req.params.method;
  if (!req.file) throw badRequest('QR image is required');
  const qrImageUrl = publicPath('qr', req.file.filename);
  const saved = await prisma.paymentMethodConfig.upsert({
    where: { method },
    update: { qrImageUrl },
    create: { method, label: method, enabled: false, qrImageUrl },
  });
  res.json({ method: publicMethod(saved) });
});

module.exports = { list, update, uploadQr, updateSchema };
