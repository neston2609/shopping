import { useEffect, useState } from 'react';
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

// ----- SFTP connection form -----
function SftpForm({ onSaved }) {
  const [form, setForm] = useState(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = () =>
    api.get('/admin/sftp').then((d) => {
      setForm({ ...d.settings, password: '' });
      setHasPassword(d.settings.hasPassword);
    });
  useEffect(() => { load(); }, []);
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    const payload = { host: form.host, port: Number(form.port), username: form.username, basePath: form.basePath, enabled: form.enabled };
    if (form.password) payload.password = form.password;
    try {
      await api.put('/admin/sftp', payload);
      setMsg({ ok: true, text: 'Settings saved.' });
      load();
      onSaved && onSaved();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  const test = async () => {
    setMsg({ ok: true, text: 'Testing…' });
    try {
      const r = await api.post('/admin/sftp/test');
      if (r.ok) {
        setMsg({ ok: true, text: r.message, sample: r.sample });
      } else {
        setMsg({ ok: false, text: r.message });
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <>
      <form className="card" onSubmit={save} style={{ maxWidth: 760 }}>
        <label className="toggle" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> DOWNLOADS ENABLED
        </label>
        <div className="grid2">
          <div className="field"><label>SFTP HOST</label><input value={form.host} onChange={set('host')} placeholder="files.example.com" /></div>
          <div className="field"><label>PORT</label><input type="number" value={form.port} onChange={set('port')} /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>USERNAME</label><input value={form.username} onChange={set('username')} /></div>
          <div className="field"><label>PASSWORD</label><input type="password" placeholder={hasPassword ? '•••• already set' : 'not set'} value={form.password} onChange={set('password')} /></div>
        </div>
        <div className="field">
          <label>BASE PATH (default starting folder for the browser)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={form.basePath} onChange={set('basePath')} placeholder="/home/files" />
            <button type="button" className="btn btn--cyan btn--sm" onClick={() => setPickerOpen(true)}>BROWSE…</button>
          </div>
        </div>

        {msg && (
          <div className={msg.ok ? 'success-msg' : 'error-msg'}>
            {msg.text}
            {msg.sample && msg.sample.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 16, fontFamily: 'VT323, monospace', fontSize: 16, lineHeight: 1.4 }}>
                {msg.sample.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn btn--lime" type="submit">SAVE</button>
          <button className="btn btn--cyan" type="button" onClick={test}>TEST CONNECTION</button>
        </div>
      </form>

      <FolderPicker
        open={pickerOpen}
        initialPath={form.basePath}
        onSelect={(p) => setForm((f) => ({ ...f, basePath: p }))}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

// ----- Category row (edit + image upload + path browse) -----
const BLANK_CAT = { name: '', slug: '', description: '', sftpPath: '', enabled: true, position: 0 };

function CategoryEditor({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || BLANK_CAT);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = { name: form.name, slug: form.slug, description: form.description, sftpPath: form.sftpPath, enabled: form.enabled, position: Number(form.position) || 0 };
      const r = initial?.id ? await api.put(`/admin/download-categories/${initial.id}`, payload) : await api.post('/admin/download-categories', payload);
      onSaved(r.category);
    } catch (err) {
      setMsg({ ok: false, text: err.details ? err.details.map((d) => d.message).join('; ') : err.message });
    }
  };

  const uploadImage = async (file) => {
    if (!initial?.id) {
      setMsg({ ok: false, text: 'Save the category first, then you can upload an image.' });
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`/api/admin/download-categories/${initial.id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Image upload failed' }); return; }
    onSaved(data.category);
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
        <div className="field">
          <label>SFTP PATH (absolute path on the SFTP server) *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={form.sftpPath} onChange={set('sftpPath')} placeholder="/var/files/roms" required />
            <button type="button" className="btn btn--cyan btn--sm" onClick={() => setPickerOpen(true)}>BROWSE…</button>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label>POSITION</label><input type="number" value={form.position} onChange={set('position')} /></div>
          <div className="field">
            <label>STATUS</label>
            <label className="toggle"><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> {form.enabled ? 'ENABLED' : 'DISABLED'}</label>
          </div>
        </div>

        {initial?.id && (
          <div className="field">
            <label>CATEGORY IMAGE</label>
            {initial.imageUrl && <img src={initial.imageUrl} alt="" style={{ width: 140, border: '2px solid #fff', marginBottom: 8 }} />}
            <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0])} />
          </div>
        )}

        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn btn--lime" type="submit">{initial?.id ? 'UPDATE' : 'CREATE'}</button>
          {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>CANCEL</button>}
        </div>
      </form>

      <FolderPicker
        open={pickerOpen}
        initialPath={form.sftpPath || undefined}
        onSelect={(p) => setForm((f) => ({ ...f, sftpPath: p }))}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

function Categories() {
  const [cats, setCats] = useState([]);
  const [editingId, setEditingId] = useState(null); // id, or 'new', or null
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
        <CategoryEditor onSaved={(c) => { setEditingId(c.id); load(); }} onCancel={() => setEditingId(null)} />
      )}

      <table>
        <thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>SFTP Path</th><th>Pos</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {cats.map((c) => (
            editingId === c.id ? (
              <tr key={c.id}>
                <td colSpan={7}>
                  <CategoryEditor initial={c} onSaved={() => { load(); }} onCancel={() => setEditingId(null)} />
                </td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td>{c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: 60, height: 40, objectFit: 'cover', border: '2px solid #fff' }} /> : <span className="muted">—</span>}</td>
                <td>{c.name}</td>
                <td className="muted">{c.slug}</td>
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
          {!cats.length && <tr><td colSpan={7} className="muted">No download categories yet. Click "+ NEW CATEGORY" to add one.</td></tr>}
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
  return (
    <>
      <div className="toprow"><div className="h1">DOWNLOADS</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>
        Configure your SFTP connection, then create download categories that map to folders on your server. Customers see the categories you create and can drill into the mapped folder + subfolders.
      </div>
      <SftpForm />
      <Categories />
      <RecentLogs />
    </>
  );
}
