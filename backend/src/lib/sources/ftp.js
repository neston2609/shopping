// SFTP / FTP / FTPS protocol implementation. Receives a DownloadSource row.
const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const { decrypt } = require('../crypto');

// Walk into a target POSIX directory one segment at a time. We do it this way
// because many FTP servers treat the LIST/RETR argument as a glob pattern, so a
// directory whose name contains `[ ]`, `*`, or `?` either returns empty or hits
// the wrong path. CWD itself is literal (no glob), so navigating per-segment
// then issuing LIST/RETR with no path is safe for any filename the server
// accepts.
async function cdAbs(client, target) {
  await client.cd('/');
  const segs = String(target || '').split('/').filter(Boolean);
  for (const s of segs) {
    // eslint-disable-next-line no-await-in-loop
    await client.cd(s);
  }
}

async function runSftp(source, fn) {
  const sftp = new SftpClient();
  await sftp.connect({
    host: source.host,
    port: source.port || 22,
    username: source.username,
    password: source.passwordEnc ? decrypt(source.passwordEnc) : undefined,
    readyTimeout: 30000,
  });
  try {
    const ops = {
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
    return await fn(ops);
  } finally {
    try { await sftp.end(); } catch (e) { /* */ }
  }
}

async function runFtp(source, secure, fn) {
  const { Client } = require('basic-ftp');
  const client = new Client(30000);
  client.ftp.verbose = false;
  await client.access({
    host: source.host,
    port: source.port || 21,
    user: source.username,
    password: source.passwordEnc ? decrypt(source.passwordEnc) : undefined,
    secure: !!secure,
    secureOptions: { rejectUnauthorized: false },
  });
  try {
    const ops = {
      async list(p) {
        // Only LIST is commonly glob-expanded by FTP servers (ProFTPD etc.),
        // so for LIST we navigate via CWD (literal) and then `list()` with no
        // argument. SIZE / CWD / RETR are typically literal, so we pass paths
        // straight through and avoid the extra round-trips that bog down the
        // category browser when there are many folders.
        await cdAbs(client, p);
        const entries = await client.list();
        return entries.map((e) => ({
          name: e.name,
          type: e.type === 2 ? 'dir' : 'file',
          size: e.size,
          modifiedAt: e.modifiedAt || null,
        }));
      },
      async stat(p) {
        try {
          const size = await client.size(p);
          return { size, isDirectory: false };
        } catch (e) {
          try {
            await client.cd(p);
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
    return await fn(ops);
  } finally {
    try { client.close(); } catch (e) { /* */ }
  }
}

async function withClient(source, fn) {
  const proto = (source.protocol || 'sftp').toLowerCase();
  if (proto === 'sftp') return runSftp(source, fn);
  if (proto === 'ftp') return runFtp(source, false, fn);
  if (proto === 'ftps') return runFtp(source, true, fn);
  throw new Error(`ftp.js: unsupported protocol ${proto}`);
}

async function listAbsolute(source, absPath) {
  return withClient(source, async (ops) => {
    const target = absPath && String(absPath).trim() ? String(absPath) : source.basePath || '/';
    const norm = path.posix.normalize(target);
    const entries = await ops.list(norm);
    return {
      path: norm,
      parent: norm === '/' ? null : path.posix.dirname(norm),
      entries: entries
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => ({ ...e, path: path.posix.join(norm, e.name) }))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)),
    };
  });
}

async function test(source) {
  return withClient(source, async (ops) => {
    const dir = source.basePath || '/';
    const entries = await ops.list(dir);
    const sample = entries.slice(0, 8).map((e) => `${e.type === 'dir' ? '📁' : '🗎'} ${e.name}`);
    return { ok: true, dir, protocol: source.protocol, total: entries.length, sample };
  });
}

module.exports = { withClient, listAbsolute, test };
