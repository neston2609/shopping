import { useEffect, useState } from 'react';
import { api } from '../api';

const PROTOCOLS = [
  { v: 'sftp',        label: 'SFTP',         defaultPort: 22, kind: 'ssh' },
  { v: 'ftp',         label: 'FTP',          defaultPort: 21, kind: 'ftp' },
  { v: 'ftps',        label: 'FTPS',         defaultPort: 21, kind: 'ftp' },
  { v: 'onedrive',    label: 'OneDrive',     defaultPort: 0,  kind: 'oauth' },
  { v: 'googledrive', label: 'Google Drive', defaultPort: 0,  kind: 'oauth' },
];

function protoMeta(p) {
  return PROTOCOLS.find((x) => x.v === p) || PROTOCOLS[0];
}

const BLANK = {
  name: '',
  protocol: 'sftp',
  enabled: true,
  host: '',
  port: 22,
  username: '',
  password: '',
  basePath: '/',
  oauthClientId: '',
  oauthClientSecret: '',
};

function SourceEditor({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial, password: '', oauthClientSecret: '' } : BLANK);
  const [msg, setMsg] = useState(null);
  const meta = protoMeta(form.protocol);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const onProtocol = (v) => {
    const m = protoMeta(v);
    setForm((f) => ({
      ...f,
      protocol: v,
      port: m.defaultPort || f.port,
      // sensible default base path per kind
      basePath: m.kind === 'oauth' ? 'root' : (f.basePath || '/'),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    const payload = {
      name: form.name,
      protocol: form.protocol,
      enabled: !!form.enabled,
      host: form.host || '',
      port: Number(form.port) || protoMeta(form.protocol).defaultPort,
      username: form.username || '',
      basePath: form.basePath || (meta.kind === 'oauth' ? 'root' : '/'),
      oauthClientId: form.oauthClientId || '',
    };
    if (form.password) payload.password = form.password;
    if (form.oauthClientSecret) payload.oauthClientSecret = form.oauthClientSecret;
    try {
      const r = initial?.id
        ? await api.put(`/admin/sources/${initial.id}`, payload)
        : await api.post('/admin/sources', payload);
      onSaved(r.source);
    } catch (err) {
      setMsg({ ok: false, text: err.details ? err.details.map((d) => d.message).join('; ') : err.message });
    }
  };

  const test = async () => {
    if (!initial?.id) {
      setMsg({ ok: false, text: 'Save first, then test.' });
      return;
    }
    setMsg({ ok: true, text: 'Testing…' });
    try {
      const r = await api.post(`/admin/sources/${initial.id}/test`);
      setMsg({ ok: r.ok, text: r.message, sample: r.sample });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  const connect = async () => {
    if (!initial?.id) { setMsg({ ok: false, text: 'Save first, then click Connect.' }); return; }
    try {
      const r = await api.post(`/admin/sources/${initial.id}/oauth/start`);
      window.open(r.url, '_blank', 'noopener');
      setMsg({ ok: true, text: 'Authorize in the new tab, then come back and click REFRESH on the list.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  const disconnect = async () => {
    if (!initial?.id) return;
    if (!confirm('Disconnect this account? You will need to re-authorize to use it again.')) return;
    try {
      await api.post(`/admin/sources/${initial.id}/disconnect`);
      onSaved({ ...initial, connected: false, oauthAccount: '' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <div className="card" style={{ marginBottom: 12, boxShadow: '4px 4px 0 var(--cyan)' }}>
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
      <form onSubmit={save}>
        <div className="grid2">
          <div className="field">
            <label>SITE NAME *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. NAS - ROMs, OneDrive - Backups" required />
          </div>
          <div className="field">
            <label>STATUS</label>
            <label className="toggle"><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> {form.enabled ? 'ENABLED' : 'DISABLED'}</label>
          </div>
        </div>

        <div className="field">
          <label>PROTOCOL</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {PROTOCOLS.map((p) => (
              <label key={p.v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name={`proto-${initial?.id || 'new'}`} value={p.v} checked={form.protocol === p.v} onChange={() => onProtocol(p.v)} />
                <span style={{ textTransform: 'uppercase', fontFamily: 'Press Start 2P, monospace', fontSize: 10 }}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {meta.kind !== 'oauth' && (
          <>
            <div className="grid2">
              <div className="field"><label>HOST</label><input value={form.host} onChange={set('host')} placeholder="files.example.com" /></div>
              <div className="field"><label>PORT</label><input type="number" value={form.port} onChange={set('port')} /></div>
            </div>
            <div className="grid2">
              <div className="field"><label>USERNAME</label><input value={form.username} onChange={set('username')} /></div>
              <div className="field">
                <label>PASSWORD</label>
                <input type="password" placeholder={initial?.hasPassword ? '•••• already set' : 'not set'} value={form.password} onChange={set('password')} />
              </div>
            </div>
            <div className="field">
              <label>BASE PATH (folder root for the browser)</label>
              <input value={form.basePath} onChange={set('basePath')} placeholder="/home/files" />
            </div>
          </>
        )}

        {meta.kind === 'oauth' && (
          <>
            <div className="muted" style={{ marginBottom: 10 }}>
              Register an OAuth app at{' '}
              {form.protocol === 'onedrive' ? (
                <>
                  <a href="https://entra.microsoft.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>Microsoft Entra (Azure AD)</a>
                  &nbsp;→ App registrations → New registration. Add redirect URI <code>{window.location.origin}/api/sources/oauth/callback</code> (Web). Required permissions: <code>Files.Read</code>, <code>User.Read</code>, <code>offline_access</code>.
                </>
              ) : (
                <>
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>Google Cloud → APIs & Services → Credentials</a>
                  &nbsp;→ Create OAuth client → Web. Add redirect URI <code>{window.location.origin}/api/sources/oauth/callback</code>. Enable the Google Drive API.
                </>
              )}
            </div>
            <div className="grid2">
              <div className="field"><label>OAUTH CLIENT ID</label><input value={form.oauthClientId} onChange={set('oauthClientId')} /></div>
              <div className="field">
                <label>OAUTH CLIENT SECRET</label>
                <input type="password" placeholder={initial?.hasOauthSecret ? '•••• already set' : 'not set'} value={form.oauthClientSecret} onChange={set('oauthClientSecret')} />
              </div>
            </div>
            <div className="field">
              <label>ROOT FOLDER ID (use "root" for the drive root, or paste a folder ID)</label>
              <input value={form.basePath} onChange={set('basePath')} placeholder="root" />
            </div>
            {initial?.id && (
              <div className="row-actions" style={{ marginBottom: 10 }}>
                {!initial.connected ? (
                  <button type="button" className="btn btn--cyan btn--sm" onClick={connect}>CONNECT {meta.label.toUpperCase()}…</button>
                ) : (
                  <>
                    <span className="badge active" style={{ marginRight: 8 }}>CONNECTED{initial.oauthAccount ? ` — ${initial.oauthAccount}` : ''}</span>
                    <button type="button" className="btn btn--sm" onClick={disconnect}>DISCONNECT</button>
                  </>
                )}
              </div>
            )}
            {!initial?.id && (
              <div className="muted" style={{ marginBottom: 8 }}>Save this source first, then click <b>Connect</b> to authorize.</div>
            )}
          </>
        )}

        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn btn--lime" type="submit">{initial?.id ? 'UPDATE' : 'CREATE'}</button>
          {initial?.id && meta.kind !== 'oauth' && (
            <button type="button" className="btn btn--cyan" onClick={test}>TEST CONNECTION</button>
          )}
          {initial?.id && meta.kind === 'oauth' && initial.connected && (
            <button type="button" className="btn btn--cyan" onClick={test}>TEST</button>
          )}
          {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>CANCEL</button>}
        </div>
      </form>
    </div>
  );
}

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [editingId, setEditingId] = useState(null); // id, or 'new', or null

  const load = () => api.get('/admin/sources').then((d) => setSources(d.sources || []));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this source? Any categories using it will become unmapped.')) return;
    try {
      await api.del(`/admin/sources/${id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="toprow"><div className="h1">DOWNLOAD SOURCES</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>
        Each <b>source</b> is one place where files live (an SFTP/FTP/FTPS server, or a cloud account like OneDrive / Google Drive). Categories on the
        <b> DOWNLOADS</b> page point at one source. You can have as many sources as you like.
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        <div className="toprow" style={{ marginBottom: 12 }}>
          <div className="px" style={{ fontSize: 12, color: 'var(--gold)' }}>SITES</div>
          <div className="row-actions">
            <button className="btn btn--ghost btn--sm" onClick={load}>REFRESH</button>
            <button className="btn btn--lime btn--sm" onClick={() => setEditingId('new')}>+ NEW SOURCE</button>
          </div>
        </div>

        {editingId === 'new' && (
          <SourceEditor onSaved={(s) => { setEditingId(s.id); load(); }} onCancel={() => setEditingId(null)} />
        )}

        <table>
          <thead>
            <tr><th>Name</th><th>Protocol</th><th>Endpoint</th><th>Status</th><th>State</th><th></th></tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              editingId === s.id ? (
                <tr key={s.id}>
                  <td colSpan={6}>
                    <SourceEditor initial={s} onSaved={() => { load(); }} onCancel={() => setEditingId(null)} />
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td><span className="px" style={{ fontSize: 10 }}>{(s.protocol || 'sftp').toUpperCase()}</span></td>
                  <td className="muted" style={{ fontFamily: 'VT323, monospace' }}>
                    {['sftp','ftp','ftps'].includes(s.protocol)
                      ? `${s.username || ''}@${s.host || '—'}:${s.port}${s.basePath ? ' ' + s.basePath : ''}`
                      : `${s.oauthAccount || (s.connected ? 'connected' : 'not connected')} • root=${s.basePath || 'root'}`}
                  </td>
                  <td><span className={`badge ${s.enabled ? 'active' : 'inactive'}`}>{s.enabled ? 'ON' : 'OFF'}</span></td>
                  <td>
                    {['sftp','ftp','ftps'].includes(s.protocol)
                      ? <span className={`badge ${s.hasPassword ? 'active' : 'inactive'}`}>{s.hasPassword ? 'PW SET' : 'NO PW'}</span>
                      : <span className={`badge ${s.connected ? 'active' : 'inactive'}`}>{s.connected ? 'LINKED' : 'NOT LINKED'}</span>}
                  </td>
                  <td className="row-actions">
                    <button className="btn btn--cyan btn--sm" onClick={() => setEditingId(s.id)}>EDIT</button>
                    <button className="btn btn--sm" onClick={() => remove(s.id)}>DEL</button>
                  </td>
                </tr>
              )
            ))}
            {!sources.length && <tr><td colSpan={6} className="muted">No sources yet. Click "+ NEW SOURCE" to add one.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
