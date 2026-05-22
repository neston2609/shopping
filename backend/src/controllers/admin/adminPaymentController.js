const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../utils/http');
const { encrypt, decrypt } = require('../../lib/crypto');

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  // arbitrary key->value map of API credentials (e.g. publishableKey, secretKey)
  config: z.record(z.string()).optional(),
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

const list = asyncHandler(async (req, res) => {
  const methods = await prisma.paymentMethodConfig.findMany({ orderBy: { id: 'asc' } });
  res.json({
    methods: methods.map((m) => ({
      id: m.id,
      method: m.method,
      label: m.label,
      enabled: m.enabled,
      config: maskConfig(m.configEnc),
    })),
  });
});

const update = asyncHandler(async (req, res) => {
  const method = req.params.method;
  const { label, enabled, config } = req.body;

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
    const merged = { ...current, ...config };
    configEnc = encrypt(JSON.stringify(merged));
  }

  const saved = await prisma.paymentMethodConfig.upsert({
    where: { method },
    update: { label: label ?? existing?.label, enabled: enabled ?? existing?.enabled, configEnc },
    create: { method, label: label || method, enabled: enabled ?? false, configEnc },
  });

  res.json({ method: { id: saved.id, method: saved.method, label: saved.label, enabled: saved.enabled, config: maskConfig(saved.configEnc) } });
});

module.exports = { list, update, updateSchema };
