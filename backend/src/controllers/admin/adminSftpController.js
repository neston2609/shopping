const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, badRequest } = require('../../utils/http');
const { encrypt } = require('../../lib/crypto');
const { testConnection, listAbsolute } = require('../../lib/sftp');

const updateSchema = z.object({
  protocol: z.enum(['sftp', 'ftp', 'ftps']).default('sftp'),
  host: z.string().min(1),
  port: z.coerce.number().int().positive().default(22),
  username: z.string().min(1),
  password: z.string().optional(), // only updated when provided
  basePath: z.string().min(1).default('/'),
  enabled: z.boolean().optional(),
});

async function getRow() {
  let row = await prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.sftpSettings.create({ data: {} });
  return row;
}

function publicSettings(row) {
  return {
    id: row.id,
    protocol: row.protocol || 'sftp',
    host: row.host || '',
    port: row.port,
    username: row.username || '',
    hasPassword: !!row.passwordEnc,
    basePath: row.basePath,
    enabled: row.enabled,
  };
}

const get = asyncHandler(async (req, res) => {
  res.json({ settings: publicSettings(await getRow()) });
});

const update = asyncHandler(async (req, res) => {
  const row = await getRow();
  const { protocol, host, port, username, password, basePath, enabled } = req.body;
  const data = { protocol, host, port, username, basePath, enabled: enabled ?? row.enabled };
  if (password) data.passwordEnc = encrypt(password);
  const saved = await prisma.sftpSettings.update({ where: { id: row.id }, data });
  res.json({ settings: publicSettings(saved) });
});

// POST /api/admin/sftp/test  — connect using saved settings + list base path
const test = asyncHandler(async (req, res) => {
  const row = await getRow();
  if (!row.host || !row.username) throw badRequest('Set host + username (and save) before testing');
  try {
    const r = await testConnection(row);
    res.json({
      ok: true,
      message: `Connected — ${r.total} item(s) at ${r.dir}`,
      dir: r.dir,
      total: r.total,
      sample: r.sample,
    });
  } catch (e) {
    res.json({ ok: false, message: e.message }); // 200 so the client reads the message
  }
});

// GET /api/admin/sftp/browse?path=<abs>  — folder picker (lists any path on the SFTP server)
const browse = asyncHandler(async (req, res) => {
  try {
    const result = await listAbsolute(req.query.path);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});

// GET /api/admin/downloads/logs  — recent download audit
const listLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.downloadLog.findMany({
    orderBy: { id: 'desc' },
    take: 50,
    include: { user: true },
  });
  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      fileName: l.fileName,
      path: l.path,
      sizeBytes: l.sizeBytes,
      user: l.user ? l.user.email : 'guest',
      ip: l.ip,
      createdAt: l.createdAt,
    })),
  });
});

module.exports = { get, update, test, browse, listLogs, updateSchema };
