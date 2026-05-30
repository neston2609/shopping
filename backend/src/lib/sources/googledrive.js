// Google Drive v3. Paths are folder ids ("root" = My Drive root).
const { getAccessToken } = require('./oauth');

const API = 'https://www.googleapis.com/drive/v3';
const FIELDS = 'files(id,name,mimeType,size,modifiedTime,parents),nextPageToken';

async function api(source, urlPath, opts = {}) {
  const token = await getAccessToken(source);
  const url = urlPath.startsWith('http') ? urlPath : `${API}${urlPath}`;
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Drive ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

function isFolder(it) { return it.mimeType === 'application/vnd.google-apps.folder'; }
function shape(it) {
  return {
    name: it.name,
    type: isFolder(it) ? 'dir' : 'file',
    size: it.size ? Number(it.size) : 0,
    modifiedAt: it.modifiedTime || null,
    id: it.id,
    mimeType: it.mimeType,
  };
}

async function listById(source, folderId) {
  const id = (!folderId || folderId === 'root') ? 'root' : folderId;
  const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
  let url = `${API}/files?q=${q}&fields=${encodeURIComponent(FIELDS)}&pageSize=1000`;
  const out = [];
  while (url) {
    const data = await api(source, url);
    for (const f of data.files || []) out.push(f);
    url = data.nextPageToken ? `${API}/files?q=${q}&fields=${encodeURIComponent(FIELDS)}&pageSize=1000&pageToken=${data.nextPageToken}` : null;
  }
  return out;
}

async function listAbsolute(source, absPath) {
  const id = (!absPath || absPath === 'root') ? 'root' : absPath;
  const items = await listById(source, id);
  let parent = null;
  let pathLabel = '/';
  if (id !== 'root') {
    try {
      const meta = await api(source, `/files/${id}?fields=id,name,parents`);
      pathLabel = `/${meta.name}`;
      parent = meta.parents?.[0] || 'root';
    } catch (e) { /* */ }
  }
  return {
    path: pathLabel,
    parent,
    entries: items
      .filter((it) => !it.name.startsWith('.'))
      .map((it) => ({ ...shape(it), path: it.id }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)),
  };
}

async function listInCategory(source, rootId, sub) {
  const id = sub && String(sub).trim() ? String(sub) : (rootId || 'root');
  const items = await listById(source, id);
  return items
    .filter((it) => !it.name.startsWith('.'))
    .filter((it) => !/^folder\.jpg$/i.test(it.name))
    .map((it) => ({ ...shape(it), path: it.id }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}

async function streamFromCategory(source, rootId, sub, res) {
  const token = await getAccessToken(source);
  if (!sub) throw new Error('No file id');
  const r = await fetch(`${API}/files/${sub}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Drive ${r.status}: ${text.slice(0, 200)}`);
  }
  const len = r.headers.get('content-length');
  if (len && !res.getHeader('Content-Length')) res.setHeader('Content-Length', len);
  const { Readable } = require('stream');
  const stream = Readable.fromWeb(r.body);
  stream.pipe(res);
  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return { name: '', size: len ? Number(len) : 0 };
}

async function test(source) {
  const kids = await listById(source, 'root');
  const sample = kids.slice(0, 8).map((it) => `${isFolder(it) ? '📁' : '🗎'} ${it.name}`);
  return { ok: true, dir: 'My Drive', protocol: 'googledrive', account: source.oauthAccount, total: kids.length, sample };
}

async function withClient(source, fn) {
  return fn({});
}

module.exports = { withClient, listAbsolute, listInCategory, streamFromCategory, test };
