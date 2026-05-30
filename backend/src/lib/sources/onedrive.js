// OneDrive via Microsoft Graph. For DownloadCategory.sftpPath we store the
// drive item id of the category root (or "root" sentinel for the drive root).
// Subfolder paths are stored as ids returned by previous list calls — the
// frontend treats them as opaque strings.
const { getAccessToken } = require('./oauth');

const GRAPH = 'https://graph.microsoft.com/v1.0';

async function api(source, urlPath, opts = {}) {
  const token = await getAccessToken(source);
  const url = urlPath.startsWith('http') ? urlPath : `${GRAPH}${urlPath}`;
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Graph ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

function shape(item) {
  return {
    name: item.name,
    type: item.folder ? 'dir' : 'file',
    size: item.size,
    modifiedAt: item.lastModifiedDateTime || null,
    id: item.id,
  };
}

async function listById(source, itemId) {
  const id = (!itemId || itemId === 'root') ? 'root' : itemId;
  const path = id === 'root' ? '/me/drive/root/children' : `/me/drive/items/${id}/children`;
  // Paginate to get all children
  let url = `${GRAPH}${path}?$top=500`;
  const out = [];
  while (url) {
    const data = await api(source, url);
    for (const it of data.value || []) out.push(it);
    url = data['@odata.nextLink'] || null;
  }
  return out;
}

// Admin folder picker — absPath is a folder id, "" or "root" = drive root.
async function listAbsolute(source, absPath) {
  const id = (!absPath || absPath === 'root') ? 'root' : absPath;
  const items = await listById(source, id);
  // Determine display path label
  let pathLabel = '/';
  let parent = null;
  if (id !== 'root') {
    try {
      const meta = await api(source, `/me/drive/items/${id}`);
      pathLabel = meta.parentReference?.path ? `${meta.parentReference.path}/${meta.name}`.replace('/drive/root:', '') || '/' : `/${meta.name}`;
      parent = meta.parentReference?.id || 'root';
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

// List children of a category (rootId), or sub if customer drilled in (sub is also an item id).
async function listInCategory(source, rootId, sub) {
  const id = sub && String(sub).trim() ? String(sub) : (rootId || 'root');
  const items = await listById(source, id);
  // Detect folder.jpg children up front (no extra requests needed).
  const childMap = new Map();
  items.forEach((it) => { if (/^folder\.jpg$/i.test(it.name)) childMap.set(it.id, it); });
  const out = items
    .filter((it) => !it.name.startsWith('.'))
    .filter((it) => !/^folder\.jpg$/i.test(it.name)) // hide the cover from the list
    .map((it) => {
      const s = { ...shape(it), path: it.id };
      // If this is a folder, fetch its folder.jpg (if any) via a peek — defer to first nav for perf.
      // Simpler: include thumb only when we know it. We don't know without a recursive call, so skip
      // pre-listing for OneDrive (slow); customer can still see image when opening folder.
      return s;
    })
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  return out;
}

// Stream a file (sub = item id) to res.
async function streamFromCategory(source, rootId, sub, res) {
  const token = await getAccessToken(source);
  if (!sub) throw new Error('No file id');
  const r = await fetch(`${GRAPH}/me/drive/items/${sub}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'follow',
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Graph ${r.status}: ${text.slice(0, 200)}`);
  }
  // Try to pick up filename and length
  const cd = r.headers.get('content-disposition');
  const mName = cd && /filename\*?=("[^"]+"|[^;]+)/i.exec(cd);
  if (mName && !res.getHeader('Content-Disposition')) {
    res.setHeader('Content-Disposition', `attachment; filename=${mName[1].replace(/^UTF-8''/, '')}`);
  }
  const len = r.headers.get('content-length');
  if (len && !res.getHeader('Content-Length')) res.setHeader('Content-Length', len);
  // Pipe body to response
  const { Readable } = require('stream');
  const stream = Readable.fromWeb(r.body);
  stream.pipe(res);
  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return { name: mName ? mName[1].replace(/^UTF-8''/, '').replace(/"/g, '') : '', size: len ? Number(len) : 0 };
}

async function test(source) {
  const root = await api(source, '/me/drive/root');
  const kids = await listById(source, 'root');
  const sample = kids.slice(0, 8).map((it) => `${it.folder ? '📁' : '🗎'} ${it.name}`);
  return {
    ok: true,
    dir: root.name || 'root',
    protocol: 'onedrive',
    account: source.oauthAccount,
    total: kids.length,
    sample,
  };
}

// withClient is a no-op for cloud (HTTP-only, no persistent connection).
async function withClient(source, fn) {
  return fn({ /* ops not used for cloud */ });
}

module.exports = { withClient, listAbsolute, listInCategory, streamFromCategory, test };
