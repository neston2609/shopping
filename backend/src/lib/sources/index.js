// Source dispatcher. Each protocol implements: list(absPath), stat(absPath),
// streamTo(absPath, writable). The shared functions below handle hide-rule
// filtering, path-safety, and folder.jpg thumb detection.
const path = require('path');
const prisma = require('../prisma');
const { ApiError } = require('../../utils/http');

const ftp = require('./ftp');
const onedrive = require('./onedrive');
const googledrive = require('./googledrive');

function impl(protocol) {
  switch ((protocol || 'sftp').toLowerCase()) {
    case 'sftp': return ftp;
    case 'ftp': return ftp;
    case 'ftps': return ftp;
    case 'onedrive': return onedrive;
    case 'googledrive': return googledrive;
    default: throw new ApiError(400, `Unsupported protocol: ${protocol}`);
  }
}

// Run fn with a connected client for the source.
async function withClient(source, fn, opts = {}) {
  if (!source) throw new ApiError(503, 'No download source configured');
  if (opts.requireEnabled !== false && !source.enabled) throw new ApiError(503, 'This download source is disabled');
  return impl(source.protocol).withClient(source, fn, opts);
}

// ---- path safety (used by SFTP/FTP/FTPS paths) ----
function safeResolve(rootPath, sub) {
  const root = (rootPath || '/').replace(/\/+$/, '') || '/';
  const cleaned = path.posix.normalize('/' + String(sub || '')).replace(/^\/+/, '');
  if (cleaned.split('/').some((s) => s === '..')) throw new ApiError(400, 'Invalid path');
  const full = path.posix.join(root, cleaned);
  if (!(full === root || full.startsWith(root + '/'))) throw new ApiError(400, 'Invalid path');
  return full;
}

// ---- hide rules ----
function patternToRegex(p) {
  const escaped = String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const glob = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${glob}$`, 'i');
}
async function getHideRules() {
  const rules = await prisma.downloadHideRule.findMany({ where: { enabled: true }, orderBy: { id: 'asc' } });
  return rules.map((r) => patternToRegex(r.pattern));
}
const isHidden = (name, regs) => regs.some((r) => r.test(name));

// ---- public API ----

// Admin folder picker: list anywhere on the source. For SFTP/FTP/FTPS this is
// an absolute filesystem path; for OneDrive/GDrive it is a folder id (use ''
// or '/' or 'root' for the drive root).
async function listAbsolute(source, absPath) {
  const result = await impl(source.protocol).listAbsolute(source, absPath);
  return result;
}

async function listForCategory(category, sub) {
  if (!category.source) throw new ApiError(503, 'This category has no download source');
  const src = category.source;
  const hideRegexes = await getHideRules();
  const proto = (src.protocol || 'sftp').toLowerCase();
  if (proto === 'onedrive' || proto === 'googledrive') {
    // For cloud sources, sub is a relative path that the impl resolves against category.sftpPath (root id).
    const entries = await impl(src.protocol).listInCategory(src, category.sftpPath, sub);
    return entries
      .filter((e) => !isHidden(e.name, hideRegexes))
      .map((e) => ({ ...e, path: (sub ? sub.replace(/\/+$/, '') + '/' : '') + e.name }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  }
  // SFTP/FTP/FTPS
  return withClient(src, async (ops) => {
    const dir = safeResolve(category.sftpPath, sub);
    const entries = await ops.list(dir);
    const cleanSub = String(sub || '').replace(/^\/+|\/+$/g, '');
    const visible = entries.filter((e) => !e.name.startsWith('.')).filter((e) => !isHidden(e.name, hideRegexes));
    const out = [];
    for (const e of visible) {
      const shaped = {
        name: e.name,
        type: e.type,
        size: e.size,
        modifiedAt: e.modifiedAt || null,
        path: (cleanSub ? `${cleanSub}/` : '') + e.name,
      };
      if (e.type === 'dir') {
        try {
          const st = await ops.stat(path.posix.join(dir, e.name, 'folder.jpg'));
          if (!st.isDirectory) shaped.thumb = (cleanSub ? `${cleanSub}/` : '') + e.name + '/folder.jpg';
        } catch (er) { /* no folder.jpg */ }
      }
      out.push(shaped);
    }
    return out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  });
}

async function streamFromCategory(category, sub, res) {
  if (!category.source) throw new ApiError(503, 'This category has no download source');
  const src = category.source;
  const hideRegexes = await getHideRules();
  const proto = (src.protocol || 'sftp').toLowerCase();
  if (proto === 'onedrive' || proto === 'googledrive') {
    const segments = String(sub || '').split('/').filter(Boolean);
    if (segments.some((s) => isHidden(s, hideRegexes))) throw new ApiError(404, 'File not found');
    return impl(src.protocol).streamFromCategory(src, category.sftpPath, sub, res);
  }
  return withClient(src, async (ops) => {
    const full = safeResolve(category.sftpPath, sub);
    if (full.split('/').filter(Boolean).some((s) => isHidden(s, hideRegexes))) throw new ApiError(404, 'File not found');
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

// Inline image stream (folder.jpg) — hide rules NOT enforced; only image
// extensions allowed.
async function streamInline(category, sub, res) {
  if (!category.source) throw new ApiError(503, 'This category has no download source');
  const src = category.source;
  const proto = (src.protocol || 'sftp').toLowerCase();
  if (!/\.(jpe?g|png|webp|gif)$/i.test(sub || '')) throw new ApiError(400, 'Not an image');
  const mime =
    /\.png$/i.test(sub) ? 'image/png' :
    /\.webp$/i.test(sub) ? 'image/webp' :
    /\.gif$/i.test(sub) ? 'image/gif' :
                          'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (proto === 'onedrive' || proto === 'googledrive') {
    return impl(src.protocol).streamFromCategory(src, category.sftpPath, sub, res);
  }
  return withClient(src, async (ops) => {
    const full = safeResolve(category.sftpPath, sub);
    await ops.streamTo(full, res);
  });
}

// Admin connection test for a source row.
async function testSource(source) {
  return impl(source.protocol).test(source);
}

module.exports = { withClient, listAbsolute, listForCategory, streamFromCategory, streamInline, testSource, safeResolve };
