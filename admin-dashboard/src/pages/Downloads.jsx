import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken } from '../api';
import FolderPicker from '../components/FolderPicker';

function fmtSize(n) {
  if (n == null) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let x = Number(n);
  let i = 0;
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i ? 1 : 0)} ${u[i]}`;
}

// ----- Display / global settings (master enable, aff gate, thumb size) -----
function DisplaySettings({ sourceCount }) {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/admin/sftp').then((d) => setForm(d.settings));
  useEffect(() => { load(); }, []);
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        enabled: !!form.enabled,
        affLink: form.affLink || '',
        affDelaySeconds: Number(form.affDelaySeconds) || 0,
        folderThumbHeight: Number(form.folderThumbHeight) || 48,
      };
      await api.put('/admin/sftp', payload);
      setMsg({ ok: true, text: 'Settings saved.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <form className="card" onSubmit={save} style={{ maxWidth: 760 }}>
      {form.enabled && sourceCount === 0 && (
        <div className="error-msg" style={{ marginBottom: 14 }}>
          ⚠ Downloads are enabled but you haven't created any <b>SOURCES</b> yet — head to <Link to="/sources" style={{ color: 'var(--cyan)' }}>DOWNLOAD SOURCES</Link> and add at least one site.
        </div>
      )}
      {!form.enabled && (
        <div className="error-msg" style={{ marginBottom: 14 }}>
          ⚠ <b>DOWNLOADS ENABLED</b> is off — customers will see "Downloads are currently disabled". Tick the box below and SAVE.
        </div>
      )}
      <label className="toggle" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> DOWNLOADS ENABLED (master switch)
      </label>

      <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6, marginBottom: 6 }}>// AFFILIATE GATE (optional)</div>
      <div className="muted" style={{ marginBottom: 8 }}>If set, the customer's download click opens this URL in a new tab and they have to wait the configured seconds before the file actually downloads.</div>
      <div className="grid2">
        <div className="field"><label>AFFILIATE LINK</label><input value={form.affLink || ''} onChange={set('affLink')} placeholder="https://yourshorturl.com/abc (leave blank to skip)" /></div>
        <div className="field"><label>DELAY (SECONDS, 0-120)</label><input type="number" min="0" max="120" value={form.affDelaySeconds ?? 0} onChange={set('affDelaySeconds')} /></div>
      </div>

      <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginTop: 14, marginBottom: 6 }}>// FOLDER THUMBNAIL DISPLAY</div>
      <div className="field">
        <label>FOLDER.JPG THUMBNAIL HEIGHT (px) — width auto-scales by aspect ratio</label>
        <input type="number" min="16" max="400" value={form.folderThumbHeight ?? 48} onChange={set('folderThumbHeight')} />
      </div>

      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}

      <div className="row-actions" style={{ marginTop: 10 }}>
        <button className="btn btn--lime" type="submit">SAVE</button>
        <Link to="/sources" className="btn btn--cyan btn--sm" style={{ textDecoration: 'none' }}>MANAGE SOURCES →</Link>
      </div>
    </form>
  );
}

// ----- Category row (edit + image upload + path browse) -----
const BLANK_CAT = { name: '', slug: '', description: '', sourceId: '', sftpPath: '', enabled: true, position: 0 };

function CategoryEditor({ initial, sources, onSaved, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial, sourceId: initial.sourceId || '' } : BLANK_CAT);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const currentSource = sources.find((s) => String(s.id) === String(form.sourceId));
  const isCloud = currentSource && ['onedrive', 'googledrive'].includes(currentSource.protocol);
  const pathLabel = isCloud ? 'FOLDER ID (paste an id, or use "root" for the drive root) *' : 'PATH (absolute path on the server) *';
  const pathPlaceholder = isCloud ? 'root  or  01ABCDXYZ123…' : '/var/files/roms';

  const choosePendingImage = (file) => {
    if (!file) {
      setPendingImage(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    setPendingImage(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImageFor = async (id, file) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`/api/admin/download-categories/${id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Image upload failed');
    return data.category;
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!form.sourceId) { setMsg({ ok: false, text: 'Pick a source.' }); return; }
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        sourceId: Number(form.sourceId) || null,
        sftpPath: form.sftpPath,
        enabled: form.enabled,
        position: Number(form.position) || 0,
      };
      const r = initial?.id
        ? await api.put(`/admin/download-categories/${initial.id}`, payload)
        : await api.post('/admin/download-categories', payload);
      let cat = r.category;
      if (pendingImage) {
        cat = await uploadImageFor(cat.id, pendingImage);
      }
      setPendingImage(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onSaved(cat);
    } catch (err) {
      setMsg({ ok: false, text: err.details ? err.details.map((d) => d.message).join('; ') : err.message });
    }
  };

  return (
    <div className="card" style={{ marginBottom: 12, boxShadow: '4px 4px 0 var(--cyan)' }}>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}
      <form onSubmit={save}>
        <div className="grid2">
          <div className="field"><label>NAME *</label><input value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label>SLUG (auto if blank)</label><input value={form.slug} onChange={set('slug')} placeholder={form.name ? form.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') : ''} /></div>
        </div>
        <div className="field"><label>DESCRIPTION</label><textarea value={form.description} onChange={set('description')} style={{ minHeight: 60 }} /></div>

        <div className="grid2">
          <div className="field">
            <label>SOURCE *</label>
            <select value={form.sourceId} onChange={set('sourceId')} required>
              <option value="">— pick a source —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} [{(s.protocol || 'sftp').toUpperCase()}]{s.enabled ? '' : ' (disabled)'}
                </option>
              ))}
            </select>
            {!sources.length && <div className="muted" style={{ marginTop: 6 }}>No sources yet. <Link to="/sources" style={{ color: 'var(--cyan)' }}>Create one →</Link></div>}
          </div>
          <div className="field">
            <label>POSITION</label>
            <input type="number" value={form.position} onChange={set('position')} />
          </div>
        </div>

        <div className="field">
          <label>{pathLabel}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={form.sftpPath} onChange={set('sftpPath')} placeholder={pathPlaceholder} required />
            <button type="button" className="btn btn--cyan btn--sm" disabled={!form.sourceId} onClick={() => setPickerOpen(true)}>BROWSE…</button>
          </div>
          {isCloud && <div className="muted" style={{ marginTop: 6 }}>Tip: open the folder in {currentSource?.protocol === 'onedrive' ? 'OneDrive' : 'Google Drive'}, copy the folder id from the URL, paste it here — or use BROWSE.</div>}
        </div>

        <div className="field">
          <label>STATUS</label>
          <label className="toggle"><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> {form.enabled ? 'ENABLED' : 'DISABLED'}</label>
        </div>

        <div className="field">
          <label>CATEGORY IMAGE</label>
          {(previewUrl || initial?.imageUrl) && (
            <img src={previewUrl || initial.imageUrl} alt="" style={{ width: 160, height: 100, objectFit: 'cover', border: '2px solid #fff', marginBottom: 8 }} />
          )}
          <input type="file" accept="image/*" onChange={(e) => choosePendingImage(e.target.files[0])} />
          {pendingImage && <div className="muted" style={{ marginTop: 6 }}>Image will upload when you click {initial?.id ? 'UPDATE' : 'CREATE'}.</div>}
        </div>

        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn btn--lime" type="submit">{initial?.id ? 'UPDATE' : 'CREATE'}</button>
          {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>CANCEL</button>}
        </div>
      </form>

      <FolderPicker
        open={pickerOpen}
        sourceId={form.sourceId ? Number(form.sourceId) : null}
        initialPath={form.sftpPath || undefined}
        onSelect={(p) => setForm((f) => ({ ...f, sftpPath: p }))}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

function Categories({ sources }) {
  const [cats, setCats] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const load = () => api.get('/admin/download-categories').then((d) => setCats(d.categories || []));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this category?')) return;
    await api.del(`/admin/download-categories/${id}`);
    load();
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="toprow" style={{ marginBottom: 12 }}>
        <div className="px" style={{ fontSize: 12, color: 'var(--gold)' }}>DOWNLOAD CATEGORIES</div>
        <button className="btn btn--lime btn--sm" onClick={() => setEditingId('new')}>+ NEW CATEGORY</button>
      </div>

      {editingId === 'new' && (
        <CategoryEditor sources={sources} onSaved={(c) => { setEditingId(c.id); load(); }} onCancel={() => setEditingId(null)} />
      )}

      <table>
        <thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>Source</th><th>Path / Folder Id</th><th>Pos</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {cats.map((c) => (
            editingId === c.id ? (
              <tr key={c.id}>
                <td colSpan={8}>
                  <CategoryEditor initial={c} sources={sources} onSaved={() => { load(); }} onCancel={() => setEditingId(null)} />
                </td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td>{c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: 60, height: 40, objectFit: 'cover', border: '2px solid #fff' }} /> : <span className="muted">—</span>}</td>
                <td>{c.name}</td>
                <td className="muted">{c.slug}</td>
                <td>
                  {c.sourceName ? (
                    <>
                      {c.sourceName}{' '}
                      <span className="px" style={{ fontSize: 9, color: 'var(--gold)' }}>[{(c.sourceProtocol || 'sftp').toUpperCase()}]</span>
                    </>
                  ) : (
                    <span className="error-msg" style={{ padding: '2px 6px', fontSize: 11 }}>UNMAPPED</span>
                  )}
                </td>
                <td className="muted" style={{ fontFamily: 'VT323, monospace' }}>{c.sftpPath}</td>
                <td>{c.position}</td>
                <td><span className={`badge ${c.enabled ? 'active' : 'inactive'}`}>{c.enabled ? 'ON' : 'OFF'}</span></td>
                <td className="row-actions">
                  <button className="btn btn--cyan btn--sm" onClick={() => setEditingId(c.id)}>EDIT</button>
                  <button className="btn btn--sm" onClick={() => remove(c.id)}>DEL</button>
                </td>
              </tr>
            )
          ))}
          {!cats.length && <tr><td colSpan={8} className="muted">No download categories yet. Click "+ NEW CATEGORY" to add one.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ----- Hide rules (unchanged) -----
function HideRules() {
  const [rules, setRules] = useState([]);
  const [newPattern, setNewPattern] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPattern, setEditPattern] = useState('');
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/admin/download-hide-rules').then((d) => setRules(d.rules || []));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!newPattern.trim()) return;
    setMsg(null);
    try {
      await api.post('/admin/download-hide-rules', { pattern: newPattern.trim() });
      setNewPattern('');
      load();
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  const save = async (id) => {
    if (!editPattern.trim()) return;
    setMsg(null);
    try {
      await api.put(`/admin/download-hide-rules/${id}`, { pattern: editPattern.trim(), enabled: true });
      setEditingId(null);
      load();
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  const toggle = async (r) => {
    await api.put(`/admin/download-hide-rules/${r.id}`, { pattern: r.pattern, enabled: !r.enabled });
    load();
  };

  const remove = async (id) => {
    if (!confirm('Remove this hide rule?')) return;
    await api.del(`/admin/download-hide-rules/${id}`);
    load();
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="toprow" style={{ marginBottom: 8 }}>
        <div className="px" style={{ fontSize: 12, color: 'var(--gold)' }}>HIDE RULES</div>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Patterns hide matching files <i>and</i> folders from customers. Use <code>*</code> as a wildcard.
        Examples: <code>*.jpg</code>, <code>*.tmp</code>, <code>Thumbs.db</code>, <code>*backup*</code>, <code>__MACOSX</code>.
      </div>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}

      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={{ flex: 1, padding: 10, background: '#0b0220', border: '3px solid #fff', color: '#fff' }} value={newPattern} onChange={(e) => setNewPattern(e.target.value)} placeholder="*.jpg or secret.txt or *backup*" />
        <button className="btn btn--lime btn--sm" type="submit">+ ADD RULE</button>
      </form>

      <table>
        <thead><tr><th>Pattern</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rules.map((r) => (
            editingId === r.id ? (
              <tr key={r.id}>
                <td><input value={editPattern} onChange={(e) => setEditPattern(e.target.value)} autoFocus /></td>
                <td><span className="badge active">ON</span></td>
                <td className="row-actions">
                  <button className="btn btn--lime btn--sm" onClick={() => save(r.id)}>SAVE</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>CANCEL</button>
                </td>
              </tr>
            ) : (
              <tr key={r.id}>
                <td style={{ fontFamily: 'VT323, monospace', fontSize: 18 }}>{r.pattern}</td>
                <td><span className={`badge ${r.enabled ? 'active' : 'inactive'}`} style={{ cursor: 'pointer' }} onClick={() => toggle(r)}>{r.enabled ? 'ON' : 'OFF'}</span></td>
                <td className="row-actions">
                  <button className="btn btn--cyan btn--sm" onClick={() => { setEditingId(r.id); setEditPattern(r.pattern); }}>EDIT</button>
                  <button className="btn btn--sm" onClick={() => remove(r.id)}>DEL</button>
                </td>
              </tr>
            )
          ))}
          {!rules.length && <tr><td colSpan={3} className="muted">No hide rules. Add one above to filter files / folders.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function RecentLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get('/admin/downloads/logs').then((d) => setLogs(d.logs || [])); }, []);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>RECENT DOWNLOADS</div>
      <table>
        <thead><tr><th>File</th><th>Path</th><th>Size</th><th>User</th><th>When</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.fileName}</td>
              <td className="muted">{l.path}</td>
              <td>{fmtSize(l.sizeBytes)}</td>
              <td className="muted">{l.user}</td>
              <td className="muted">{new Date(l.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {!logs.length && <tr><td colSpan={5} className="muted">No downloads yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function Downloads() {
  const [sources, setSources] = useState([]);
  useEffect(() => { api.get('/admin/sources').then((d) => setSources(d.sources || [])).catch(() => {}); }, []);
  return (
    <>
      <div className="toprow"><div className="h1">DOWNLOADS</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>
        Manage download <b>sources</b> (servers / cloud accounts) on the{' '}
        <Link to="/sources" style={{ color: 'var(--cyan)' }}>DOWNLOAD SOURCES</Link> page, then create categories below and map each one to a source + folder.
      </div>
      <DisplaySettings sourceCount={sources.length} />
      <Categories sources={sources} />
      <HideRules />
      <RecentLogs />
    </>
  );
}
