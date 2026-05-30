const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, badRequest, notFound } = require('../../utils/http');
const { encrypt } = require('../../lib/crypto');
const sources = require('../../lib/sources');
const { listAbsolute, testSource } = sources;
const { buildAuthUrl, exchangeCode, redirectUri } = require('../../lib/sources/oauth');
const { signToken, verifyToken } = require('../../lib/token');

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  protocol: z.enum(['sftp', 'ftp', 'ftps', 'onedrive', 'googledrive']).default('sftp'),
  enabled: z.boolean().optional(),
  host: z.string().optional().or(z.literal('')),
  port: z.coerce.number().int().positive().optional(),
  username: z.string().optional().or(z.literal('')),
  password: z.string().optional(),
  basePath: z.string().optional().or(z.literal('')),
  oauthClientId: z.string().optional().or(z.literal('')),
  oauthClientSecret: z.string().optional(),
});

function publicSource(s) {
  return {
    id: s.id,
    name: s.name,
    protocol: s.protocol,
    enabled: s.enabled,
    host: s.host || '',
    port: s.port || (s.protocol === 'sftp' ? 22 : 21),
    username: s.username || '',
    hasPassword: !!s.passwordEnc,
    basePath: s.basePath || '/',
    oauthClientId: s.oauthClientId || '',
    hasOauthSecret: !!s.oauthClientSecretEnc,
    connected: !!s.oauthRefreshTokenEnc,
    oauthAccount: s.oauthAccount || '',
  };
}

const list = asyncHandler(async (req, res) => {
  const rows = await prisma.downloadSource.findMany({ orderBy: { id: 'asc' } });
  res.json({ sources: rows.map(publicSource) });
});

const create = asyncHandler(async (req, res) => {
  const d = req.body;
  const data = {
    name: d.name,
    protocol: d.protocol,
    enabled: d.enabled ?? true,
    host: d.host || null,
    port: d.port || null,
    username: d.username || null,
    basePath: d.basePath || '/',
    oauthClientId: d.oauthClientId || null,
  };
  if (d.password) data.passwordEnc = encrypt(d.password);
  if (d.oauthClientSecret) data.oauthClientSecretEnc = encrypt(d.oauthClientSecret);
  const s = await prisma.downloadSource.create({ data });
  res.status(201).json({ source: publicSource(s) });
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const d = req.body;
  const data = {
    name: d.name,
    protocol: d.protocol,
    enabled: d.enabled ?? undefined,
    host: d.host || null,
    port: d.port || null,
    username: d.username || null,
    basePath: d.basePath || '/',
    oauthClientId: d.oauthClientId || null,
  };
  if (d.password) data.passwordEnc = encrypt(d.password);
  if (d.oauthClientSecret) data.oauthClientSecretEnc = encrypt(d.oauthClientSecret);
  const s = await prisma.downloadSource.update({ where: { id }, data });
  res.json({ source: publicSource(s) });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.downloadSource.delete({ where: { id } });
  res.json({ ok: true });
});

// POST /api/admin/sources/:id/test
const test = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const source = await prisma.downloadSource.findUnique({ where: { id } });
  if (!source) throw notFound('Source not found');
  try {
    const r = await testSource(source);
    res.json({ ok: true, message: `Connected — ${r.total} item(s)${r.dir ? ' at ' + r.dir : ''}`, ...r });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});

// GET /api/admin/sources/:id/browse?path=...
const browse = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const source = await prisma.downloadSource.findUnique({ where: { id } });
  if (!source) throw notFound('Source not found');
  try {
    const r = await listAbsolute(source, req.query.path);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});

// POST /api/admin/sources/:id/oauth/start  — returns the auth URL to redirect to
const oauthStart = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const source = await prisma.downloadSource.findUnique({ where: { id } });
  if (!source) throw notFound('Source not found');
  if (!['onedrive', 'googledrive'].includes(source.protocol)) throw badRequest('This source does not use OAuth');
  if (!source.oauthClientId || !source.oauthClientSecretEnc) throw badRequest('Set OAuth client id + secret first, then save');
  // state token carries sourceId + admin user id, signed so we can verify on callback
  const state = signToken({ sub: req.user.id, role: 'oauth', sourceId: id });
  const url = buildAuthUrl(source, state);
  res.json({ url, redirectUri: redirectUri() });
});

// GET /api/admin/sources/oauth/callback?code=...&state=...  — handles redirect from provider
// NOTE: this is a public route (no auth header in browser redirect), authenticated via state JWT.
const oauthCallback = asyncHandler(async (req, res) => {
  const { code, state, error: providerError } = req.query;
  if (providerError) return res.status(400).send(`OAuth failed: ${providerError}`);
  if (!code || !state) return res.status(400).send('Missing code/state');
  let payload;
  try { payload = verifyToken(String(state)); } catch (e) { return res.status(400).send('Invalid state'); }
  if (payload.role !== 'oauth' || !payload.sourceId) return res.status(400).send('Invalid state payload');
  const source = await prisma.downloadSource.findUnique({ where: { id: payload.sourceId } });
  if (!source) return res.status(404).send('Source not found');
  try {
    await exchangeCode(source, String(code));
  } catch (e) {
    return res.status(400).send(`Token exchange failed: ${e.message}`);
  }
  // Friendly HTML response — closes/redirects back to the admin app.
  res.send(`<!doctype html><html><body style="font-family:system-ui;background:#0d0f17;color:#f1eee5;padding:40px;text-align:center">
    <h2 style="color:#9eea3c">✓ Connected</h2>
    <p>Source <b>${source.name}</b> is now linked. You can close this tab and return to the admin dashboard.</p>
    <p><a href="/admin/sources" style="color:#3dd4f0">Back to sources</a></p>
    <script>setTimeout(function(){ try{window.close();}catch(e){} }, 1500)</script>
  </body></html>`);
});

// POST /api/admin/sources/:id/disconnect  — clears OAuth tokens
const disconnect = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.downloadSource.update({
    where: { id },
    data: { oauthRefreshTokenEnc: null, oauthAccessTokenEnc: null, oauthExpiresAt: null, oauthAccount: null },
  });
  res.json({ ok: true });
});

module.exports = {
  list, create, update, remove, test, browse, oauthStart, oauthCallback, disconnect,
  upsertSchema,
};
