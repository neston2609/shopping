const fs = require('fs');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, badRequest } = require('../../utils/http');
const { encrypt, decrypt } = require('../../lib/crypto');
const { BRANDS, DEFAULT_ENDPOINTS, requiresEndpoint, resolveEndpoint, fetchModels, analyzeImages } = require('../../lib/ai');

const updateSchema = z
  .object({
    brand: z.enum(['openai', 'gemini', 'claude', 'custom']),
    // Endpoint URI is only meaningful for custom; required in that case.
    endpointUrl: z.string().url().optional().or(z.literal('')),
    apiKey: z.string().optional(), // plaintext; only updated when provided
    model: z.string().optional().or(z.literal('')),
    enabled: z.boolean().optional(),
  })
  .refine((d) => d.brand !== 'custom' || (d.endpointUrl && d.endpointUrl.length > 0), {
    message: 'Endpoint URI is required for a custom AI provider',
    path: ['endpointUrl'],
  });

// For fetch-models / test: allow an inline key (typed but not yet saved).
const keyProbeSchema = z.object({
  brand: z.enum(['openai', 'gemini', 'claude', 'custom']).optional(),
  endpointUrl: z.string().url().optional().or(z.literal('')),
  apiKey: z.string().optional(),
});

async function getSettingsRow() {
  let row = await prisma.aiSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.aiSettings.create({ data: {} });
  return row;
}

function publicSettings(row) {
  return {
    id: row.id,
    brand: row.brand,
    endpointUrl: row.endpointUrl || '',
    // The effective endpoint used for requests (default for known brands).
    effectiveEndpoint: resolveEndpoint(row.brand, row.endpointUrl),
    requiresEndpoint: requiresEndpoint(row.brand),
    hasApiKey: !!row.apiKeyEnc,
    model: row.model || '',
    enabled: row.enabled,
    brands: BRANDS,
    defaultEndpoints: DEFAULT_ENDPOINTS,
  };
}

// Resolve the key to use for a probe: inline key wins, else the stored key.
function resolveKey(inlineKey, row) {
  if (inlineKey) return inlineKey;
  return row.apiKeyEnc ? decrypt(row.apiKeyEnc) : '';
}

// GET /api/admin/ai
const get = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  res.json({ settings: publicSettings(row) });
});

// PUT /api/admin/ai
const update = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const data = req.body;
  const patch = {
    brand: data.brand,
    // Persist endpoint only for custom; clear it for known brands.
    endpointUrl: data.brand === 'custom' ? data.endpointUrl : null,
    model: data.model || null,
    enabled: data.enabled ?? row.enabled,
  };
  if (data.apiKey) patch.apiKeyEnc = encrypt(data.apiKey);
  const saved = await prisma.aiSettings.update({ where: { id: row.id }, data: patch });
  res.json({ settings: publicSettings(saved) });
});

// POST /api/admin/ai/models — fetch the live model list from the provider.
const listModels = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const brand = req.body.brand || row.brand;
  const endpointUrl = req.body.endpointUrl !== undefined ? req.body.endpointUrl : row.endpointUrl;
  const apiKey = resolveKey(req.body.apiKey, row);

  if (!apiKey) throw badRequest('Enter and/or save an API key before fetching models');
  if (requiresEndpoint(brand) && !resolveEndpoint(brand, endpointUrl)) {
    throw badRequest('Endpoint URI is required for a custom AI provider');
  }
  try {
    const models = await fetchModels({ brand, apiKey, endpointUrl });
    res.json({ ok: true, models });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message, models: [] });
  }
});

// POST /api/admin/ai/test — verify the credentials by listing models.
const test = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const brand = req.body.brand || row.brand;
  const endpointUrl = req.body.endpointUrl !== undefined ? req.body.endpointUrl : row.endpointUrl;
  const apiKey = resolveKey(req.body.apiKey, row);

  if (!apiKey) throw badRequest('Enter and/or save an API key before testing');
  try {
    const models = await fetchModels({ brand, apiKey, endpointUrl });
    res.json({ ok: true, message: `Connection OK — ${models.length} model(s) available` });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// POST /api/admin/ai/analyze-product — multipart images -> suggested fields.
// Images are uploaded to disk by multer; we read them, send to the vision
// model, then delete the temp files (the real product images are saved
// separately once the product is created).
const analyzeProduct = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) throw badRequest('Upload at least one product image');

  const row = await getSettingsRow();
  if (!row.enabled) throw badRequest('AI is disabled — enable it in AI settings first');
  const apiKey = row.apiKeyEnc ? decrypt(row.apiKeyEnc) : '';
  if (!apiKey) throw badRequest('No API key configured — set one in AI settings first');

  const cleanup = () => {
    for (const f of files) {
      fs.promises.unlink(f.path).catch(() => {});
    }
  };

  try {
    const images = files.map((f) => ({
      mimeType: f.mimetype,
      base64: fs.readFileSync(f.path).toString('base64'),
    }));
    const suggestion = await analyzeImages({
      brand: row.brand,
      apiKey,
      endpointUrl: row.endpointUrl,
      model: row.model,
      images,
    });
    // Normalise into the shape the product form expects.
    const rarities = ['common', 'rare', 'epic', 'legendary'];
    const rarity = rarities.includes(String(suggestion.rarity || '').toLowerCase())
      ? String(suggestion.rarity).toLowerCase()
      : 'common';
    res.json({
      ok: true,
      suggestion: {
        name: suggestion.name || '',
        description: suggestion.description || '',
        platform: suggestion.platform || '',
        rarity,
        price:
          suggestion.suggestedPrice != null && !Number.isNaN(Number(suggestion.suggestedPrice))
            ? Number(suggestion.suggestedPrice)
            : null,
        attributes: Array.isArray(suggestion.attributes)
          ? suggestion.attributes
              .filter((a) => a && a.name && a.value)
              .map((a) => ({ name: String(a.name), value: String(a.value) }))
          : [],
      },
    });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  } finally {
    cleanup();
  }
});

module.exports = { get, update, listModels, test, analyzeProduct, updateSchema, keyProbeSchema };
