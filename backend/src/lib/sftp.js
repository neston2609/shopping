const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const prisma = require('./prisma');
const { decrypt } = require('./crypto');
const { ApiError } = require('../utils/http');

async function getConfig() {
  return prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
}

function connOpts(row, passwordOverride) {
  return {
    host: row.host,
    port: row.port || 22,
    username: row.username,
    password: passwordOverride != null ? passwordOverride : row.passwordEnc ? decrypt(row.passwordEnc) : undefined,
    readyTimeout: 15000,
  };
}

// Safely resolve a client-supplied sub-path under the configured base path.
// Rejects absolute escapes and any ".." traversal.
function safeResolve(basePath, sub) {
  const base = (basePath || '/').replace(/\/+$/, '') || '/';
  const cleaned = path.posix.normalize('/' + String(sub || '')).replace(/^\/+/, '');
  if (cleaned.split('/').some((s) => s === '..')) throw new ApiError(400, 'Invalid path');
  const full = path.posix.join(base, cleaned);
  if (!(full === base || full.startsWith(base + '/'))) throw new ApiError(400, 'Invalid path');
  return full;
}

// Open a connection, run fn, always disconnect.
async function withClient(fn, { settingsOverride, passwordOverride } = {}) {
  const row = settingsOverride || (await getConfig());
  if (!row || !row.enabled) throw new ApiError(503, 'Downloads are not configured');
  if (!row.host || !row.username) throw new ApiError(503, 'Downloads are not configured');
  const sftp = new SftpClient();
  await sftp.connect(connOpts(row, passwordOverride));
  try {
    return await fn(sftp, row);
  } finally {
    try {
      await sftp.end();
    } catch (e) {
      /* ignore */
    }
  }
}

async function listDir(sub) {
  return withClient(async (sftp, row) => {
    const dir = safeResolve(row.basePath, sub);
    const entries = await sftp.list(dir);
    const cleanSub = String(sub || '').replace(/^\/+|\/+$/g, '');
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        type: e.type === 'd' ? 'dir' : 'file',
        size: e.size,
        modifiedAt: e.modifyTime || null,
        path: (cleanSub ? `${cleanSub}/` : '') + e.name,
      }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  });
}

// Stream a file to an Express response. Sets download headers from a prior stat.
async function streamFile(sub, res) {
  return withClient(async (sftp, row) => {
    const full = safeResolve(row.basePath, sub);
    const st = await sftp.stat(full);
    if (st.isDirectory) throw new ApiError(400, 'Not a file');
    const name = path.posix.basename(full);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);
    if (st.size) res.setHeader('Content-Length', String(st.size));
    await sftp.get(full, res); // pipes to response, resolves when complete
    return { name, size: st.size };
  });
}

// Connection test (used by admin "Test connection"). Lists the base path.
async function testConnection(settingsOverride, passwordOverride) {
  return withClient(
    async (sftp, row) => {
      const list = await sftp.list(row.basePath || '/');
      return { ok: true, entries: list.length };
    },
    { settingsOverride: { ...settingsOverride, enabled: true }, passwordOverride }
  );
}

module.exports = { getConfig, listDir, streamFile, testConnection, safeResolve };
