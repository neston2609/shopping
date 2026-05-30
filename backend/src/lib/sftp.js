// Unified remote-file lib. Supports SFTP (ssh2-sftp-client) and FTP/FTPS
// (basic-ftp), dispatched by the row.protocol field.
const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const prisma = require('./prisma');
const { decrypt } = require('./crypto');
const { ApiError } = require('../utils/http');

async function getConfig() {
  return prisma.sftpSettings.findFirst({ orderBy: { id: 'asc' } });
}

// Resolve a client-supplied sub-path under a configured root path.
// Rejects ".." traversal and any escape outside the root.
function safeResolve(rootPath, sub) {
  const root = (rootPath || '/').replace(/\/+$/, '') || '/';
  const cleaned = path.posix.normalize('/' + String(sub || '')).replace(/^\/+/, '');
  if (cleaned.split('/').some((s) => s === '..')) throw new ApiError(400, 'Invalid path');
  const full = path.posix.join(root, cleaned);
  if (!(full === root || full.startsWith(root + '/'))) throw new ApiError(400, 'Invalid path');
  return full;
}

// ---------- SFTP backend (ssh2-sftp-client) ----------
async function runSftp(row, passwordOverride, fn) {
  const sftp = new SftpClient();
  await sftp.connect({
    host: row.host,
    port: row.port || 22,
    username: row.username,
    password: passwordOverride != null ? passwordOverride : row.passwordEnc ? decrypt(row.passwordEnc) : undefined,
    readyTimeout: 30000,
  });
  try {
    const ops = {
      kind: 'sftp',
      async list(p) {
        const entries = await sftp.list(p);
        return entries.map((e) => ({
          name: e.name,
          type: e.type === 'd' ? 'dir' : 'file',
          size: e.size,
          modifiedAt: e.modifyTime || null,
        }));
      },
      async stat(p) {
        const s = await sftp.stat(p);
        return { size: s.size, isDirectory: s.isDirectory };
      },
      async streamTo(p, writable) {
        await sftp.get(p, writable);
      },
    };
    return await fn(ops, row);
  } finally {
    try { await sftp.end(); } catch (e) { /* ignore */ }
  }
}

// ---------- FTP / FTPS backend (basic-ftp) ----------
async function runFtp(row, secure, passwordOverride, fn) {
  const { Client } = require('basic-ftp');
  const client = new Client(30000); // 30s timeout
  client.ftp.verbose = false;
  await client.access({
    host: row.host,
    port: row.port || (secure ? 21 : 21),
    user: row.username,
    password: passwordOverride != null ? passwordOverride : row.passwordEnc ? decrypt(row.passwordEnc) : undefined,
    secure: !!secure,
    secureOptions: { rejectUnauthorized: false }, // NAS devices typically use self-signed certs
  });
  try {
    const ops = {
      kind: secure ? 'ftps' : 'ftp',
      async list(p) {
        const entries = await client.list(p);
        return entries.map((e) => ({
          name: e.name,
          type: e.type === 2 ? 'dir' : 'file', // basic-ftp FileType: Directory=2
          size: e.size,
          modifiedAt: e.modifiedAt || null,
        }));
      },
      async stat(p) {
        // basic-ftp: size() works for files; for directories it errors,
        // so we treat an error here as "directory".
        try {
          const size = await client.size(p);
          return { size, isDirectory: false };
        } catch (e) {
          try {
            await client.cd(p);
            await client.cdup();
            return { size: 0, isDirectory: true };
          } catch (e2) {
            throw new Error(`Cannot stat ${p}: ${e.message}`);
          }
        }
      },
      async streamTo(p, writable) {
        await client.downloadTo(writable, p);
      },
    };
    return await fn(ops, row);
  } finally {
    try { client.close(); } catch (e) { /* ignore */ }
  }
}

// Open a connection (picked by protocol), run fn, always disconnect.
async function withClient(fn, { settingsOverride, passwordOverride, requireEnabled = true } = {}) {
  const row = settingsOverride || (await getConfig());
  if (!row) throw new ApiError(503, 'Remote downloads are not configured');
  if (requireEnabled && !row.enabled) throw new ApiError(503, 'Downloads are currently disabled by the administrator');
  if (!row.host || !row.username) throw new ApiError(503, 'Host/username not set');

  const proto = (row.protocol || 'sftp').toLowerCase();
  if (proto === 'sftp') return runSftp(row, passwordOverride, fn);
  if (proto === 'ftp')  return runFtp(row, false, passwordOverride, fn);
  if (proto === 'ftps') return runFtp(row, true, passwordOverride, fn);
  throw new ApiError(400, `Unsupported protocol: ${proto}`);
}

function shape(parentPath, e, asAbsolute) {
  return {
    name: e.name,
    type: e.type,
    size: e.size,
    modifiedAt: e.modifiedAt,
    path: asAbsolute ? path.posix.join(parentPath, e.name) : (parentPath ? `${parentPath}/` : '') + e.name,
  };
}

// Admin: list any absolute path (folder picker).
async function listAbsolute(absPath) {
  return withClient(async (ops, row) => {
    const target = absPath && String(absPath).trim() ? String(absPath) : row.basePath || '/';
    const norm = path.posix.normalize(target);
    const entries = await ops.list(norm);
    return {
      path: norm,
      parent: norm === '/' ? null : path.posix.dirname(norm),
      entries: entries
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => shape(norm, e, true))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)),
    };
  }, { requireEnabled: false });
}

// Customer: list within a category's root path.
async function listForCategory(category, sub) {
  return withClient(async (ops) => {
    const dir = safeResolve(category.sftpPath, sub);
    const entries = await ops.list(dir);
    const cleanSub = String(sub || '').replace(/^\/+|\/+$/g, '');
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => shape(cleanSub, e, false))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  });
}

// Customer: stream a file from a category's root path.
async function streamFromCategory(category, sub, res) {
  return withClient(async (ops) => {
    const full = safeResolve(category.sftpPath, sub);
    const st = await ops.stat(full);
    if (st.isDirectory) throw new ApiError(400, 'Not a file');
    const name = path.posix.basename(full);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);
    if (st.size) res.setHeader('Content-Length', String(st.size));
    await ops.streamTo(full, res);
    return { name, size: st.size };
  });
}

// Connection test: list the configured base path and return a small sample.
async function testConnection(settingsOverride, passwordOverride) {
  return withClient(async (ops, row) => {
    const dir = row.basePath || '/';
    const entries = await ops.list(dir);
    const sample = entries.slice(0, 8).map((e) => `${e.type === 'dir' ? '📁' : '🗎'} ${e.name}`);
    return { ok: true, dir, protocol: ops.kind, total: entries.length, sample };
  }, { settingsOverride: settingsOverride ? { ...settingsOverride, enabled: true } : null, passwordOverride, requireEnabled: !settingsOverride });
}

module.exports = { getConfig, listAbsolute, listForCategory, streamFromCategory, testConnection, safeResolve };
