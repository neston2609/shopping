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

// Safely resolve a client-supplied sub-path under a configured root path.
// Rejects ".." traversal and any path escape outside the root.
function safeResolve(rootPath, sub) {
  const root = (rootPath || '/').replace(/\/+$/, '') || '/';
  const cleaned = path.posix.normalize('/' + String(sub || '')).replace(/^\/+/, '');
  if (cleaned.split('/').some((s) => s === '..')) throw new ApiError(400, 'Invalid path');
  const full = path.posix.join(root, cleaned);
  if (!(full === root || full.startsWith(root + '/'))) throw new ApiError(400, 'Invalid path');
  return full;
}

// Open a connection, run fn, always disconnect.
async function withClient(fn, { settingsOverride, passwordOverride, requireEnabled = true } = {}) {
  const row = settingsOverride || (await getConfig());
  if (!row) throw new ApiError(503, 'SFTP is not configured');
  if (requireEnabled && !row.enabled) throw new ApiError(503, 'SFTP is not enabled');
  if (!row.host || !row.username) throw new ApiError(503, 'SFTP host/username not set');
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

function entryShape(e, parentPath, includeAbsolute) {
  return {
    name: e.name,
    type: e.type === 'd' ? 'dir' : 'file',
    size: e.size,
    modifiedAt: e.modifyTime || null,
    path: includeAbsolute ? path.posix.join(parentPath, e.name) : (parentPath ? `${parentPath}/` : '') + e.name,
  };
}

// Admin: list any absolute path on the SFTP server (folder picker).
async function listAbsolute(absPath) {
  return withClient(async (sftp, row) => {
    const target = absPath && String(absPath).trim() ? String(absPath) : row.basePath || '/';
    const norm = path.posix.normalize(target);
    const entries = await sftp.list(norm);
    return {
      path: norm,
      parent: norm === '/' ? null : path.posix.dirname(norm),
      entries: entries
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => entryShape(e, norm, true))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)),
    };
  }, { requireEnabled: false }); // admin can browse even when downloads are disabled
}

// Customer: list a folder under a category's root path.
async function listForCategory(category, sub) {
  return withClient(async (sftp) => {
    const dir = safeResolve(category.sftpPath, sub);
    const entries = await sftp.list(dir);
    const cleanSub = String(sub || '').replace(/^\/+|\/+$/g, '');
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => entryShape(e, cleanSub, false))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  });
}

// Customer: stream a file under a category's root path.
async function streamFromCategory(category, sub, res) {
  return withClient(async (sftp) => {
    const full = safeResolve(category.sftpPath, sub);
    const st = await sftp.stat(full);
    if (st.isDirectory) throw new ApiError(400, 'Not a file');
    const name = path.posix.basename(full);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);
    if (st.size) res.setHeader('Content-Length', String(st.size));
    await sftp.get(full, res);
    return { name, size: st.size };
  });
}

// Connection test: list the configured base path and return a small sample.
async function testConnection(settingsOverride, passwordOverride) {
  return withClient(
    async (sftp, row) => {
      const dir = row.basePath || '/';
      const entries = await sftp.list(dir);
      const sample = entries.slice(0, 8).map((e) => `${e.type === 'd' ? '📁' : '🗎'} ${e.name}`);
      return { ok: true, dir, total: entries.length, sample };
    },
    { settingsOverride: settingsOverride ? { ...settingsOverride, enabled: true } : null, passwordOverride, requireEnabled: !settingsOverride }
  );
}

module.exports = {
  getConfig,
  listAbsolute,
  listForCategory,
  streamFromCategory,
  testConnection,
  safeResolve,
};
