// AI provider helpers — default endpoints + live model-list fetching.
// Known brands use their official base URL; "custom" uses an admin-supplied,
// OpenAI-compatible endpoint. Uses global fetch (Node 18+).

const BRANDS = ['openai', 'gemini', 'claude', 'custom'];

// Default base URL per brand. For "custom" the admin must supply endpointUrl.
const DEFAULT_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  claude: 'https://api.anthropic.com/v1',
};

const ANTHROPIC_VERSION = '2023-06-01';

function isValidBrand(brand) {
  return BRANDS.includes(brand);
}

// Whether this brand requires the admin to enter an Endpoint URI.
function requiresEndpoint(brand) {
  return brand === 'custom';
}

// Resolve the base URL actually used for requests.
function resolveEndpoint(brand, endpointUrl) {
  if (brand === 'custom') return (endpointUrl || '').replace(/\/+$/, '');
  return DEFAULT_ENDPOINTS[brand] || '';
}

// Small fetch wrapper with a timeout so a bad endpoint can't hang the request.
async function httpJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch (e) { body = { raw: text }; }
    }
    if (!res.ok) {
      const msg = body?.error?.message || body?.error || body?.message || `Request failed (${res.status})`;
      const err = new Error(typeof msg === 'string' ? msg : `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request to the AI provider timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Fetch the list of available model ids for the given brand/key/endpoint.
// Returns a de-duplicated, sorted array of string model ids.
async function fetchModels({ brand, apiKey, endpointUrl }) {
  if (!isValidBrand(brand)) throw new Error(`Unknown AI brand: ${brand}`);
  if (!apiKey) throw new Error('An API key is required to fetch models');
  if (requiresEndpoint(brand) && !resolveEndpoint(brand, endpointUrl)) {
    throw new Error('Endpoint URI is required for a custom AI provider');
  }

  const base = resolveEndpoint(brand, endpointUrl);
  let ids = [];

  if (brand === 'gemini') {
    // Google AI (Gemini): key is passed as a query param.
    const url = `${base}/models?key=${encodeURIComponent(apiKey)}`;
    const body = await httpJson(url);
    ids = (body?.models || [])
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''));
  } else if (brand === 'claude') {
    // Anthropic: x-api-key + anthropic-version headers.
    const url = `${base}/models?limit=1000`;
    const body = await httpJson(url, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    });
    ids = (body?.data || []).map((m) => String(m.id));
  } else {
    // OpenAI + any OpenAI-compatible custom endpoint: Bearer token, GET /models.
    const url = `${base}/models`;
    const body = await httpJson(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    ids = (body?.data || []).map((m) => String(m.id));
  }

  return [...new Set(ids.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// A sensible default vision-capable model per brand, used when the admin has
// not selected a specific model in the AI settings.
const DEFAULT_VISION_MODEL = {
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-flash',
  claude: 'claude-3-5-sonnet-latest',
};

// The product fields the AI is asked to infer from the images.
const PRODUCT_ANALYSIS_PROMPT =
  'You are a product cataloguing assistant for a retro video-game e-commerce store. ' +
  'Look at the product image(s) and infer listing details. ' +
  'Respond with ONLY a JSON object (no markdown, no prose) using these keys: ' +
  '"name" (short product title), "description" (2-4 sentence marketing description), ' +
  '"platform" (e.g. NES, SNES, Game Boy, or empty if unknown), ' +
  '"rarity" (one of: common, rare, epic, legendary), ' +
  '"suggestedPrice" (number in USD, your best estimate), ' +
  '"attributes" (array of {"name","value"} pairs for notable specs such as condition, region, year). ' +
  'If a field is unknown, use an empty string or a reasonable guess. Do not wrap the JSON in code fences.';

// Extract a JSON object from a model text response (tolerates code fences/prose).
function parseJsonLoose(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

// Send image(s) to the configured provider's vision model and return suggested
// product fields. `images` is an array of { mimeType, base64 }.
async function analyzeImages({ brand, apiKey, endpointUrl, model, images }) {
  if (!isValidBrand(brand)) throw new Error(`Unknown AI brand: ${brand}`);
  if (!apiKey) throw new Error('An API key is required');
  if (!images || images.length === 0) throw new Error('At least one image is required');
  if (requiresEndpoint(brand) && !resolveEndpoint(brand, endpointUrl)) {
    throw new Error('Endpoint URI is required for a custom AI provider');
  }

  const base = resolveEndpoint(brand, endpointUrl);
  const chosenModel = model || DEFAULT_VISION_MODEL[brand] || model;
  if (!chosenModel) throw new Error('No model selected — pick a model in AI settings first');

  let text = '';

  if (brand === 'gemini') {
    const url = `${base}/models/${encodeURIComponent(chosenModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const parts = [{ text: PRODUCT_ANALYSIS_PROMPT }];
    for (const img of images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    const body = await httpJson(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] }) },
      45000
    );
    text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  } else if (brand === 'claude') {
    const url = `${base}/messages`;
    const content = [{ type: 'text', text: PRODUCT_ANALYSIS_PROMPT }];
    for (const img of images) content.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } });
    const body = await httpJson(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
        body: JSON.stringify({ model: chosenModel, max_tokens: 1024, messages: [{ role: 'user', content }] }),
      },
      45000
    );
    text = (body?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('') || '';
  } else {
    // OpenAI + OpenAI-compatible custom endpoints: chat/completions with image_url.
    const url = `${base}/chat/completions`;
    const content = [{ type: 'text', text: PRODUCT_ANALYSIS_PROMPT }];
    for (const img of images) content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
    const body = await httpJson(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: chosenModel, max_tokens: 1024, messages: [{ role: 'user', content }] }),
      },
      45000
    );
    text = body?.choices?.[0]?.message?.content || '';
  }

  const parsed = parseJsonLoose(text);
  if (!parsed) throw new Error('The AI response could not be parsed into product details');
  return parsed;
}

module.exports = {
  BRANDS,
  DEFAULT_ENDPOINTS,
  DEFAULT_VISION_MODEL,
  isValidBrand,
  requiresEndpoint,
  resolveEndpoint,
  fetchModels,
  analyzeImages,
};
