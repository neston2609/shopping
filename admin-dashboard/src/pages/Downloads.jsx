import { useEffect, useState } from 'react';
import { api } from '../api';

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

export default function Downloads() {
  const [form, setForm] = useState(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [msg, setMsg] = useState(null);
  const [logs, setLogs] = useState([]);

  const load = () =>
    api.get('/admin/sftp').then((d) => {
      setForm({ ...d.settings, password: '' });
      setHasPassword(d.settings.hasPassword);
    });
  const loadLogs = () => api.get('/admin/downloads/logs').then((d) => setLogs(d.logs || []));
  useEffect(() => {
    load();
    loadLogs();
  }, []);

  if (!form) return <div className="px">LOADING…</div>;
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
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  const test = async () => {
    setMsg(null);
    try {
      const r = await api.post('/admin/sftp/test');
      setMsg({ ok: r.ok, text: r.message });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <>
      <div className="toprow"><div className="h1">DOWNLOADS (SFTP)</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>
        Point the downloads page at an SFTP folder. Files are streamed through the API — credentials never reach the browser. Customers must be signed in to download.
      </div>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}

      <form className="card" onSubmit={save} style={{ maxWidth: 720 }}>
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
        <div className="field"><label>BASE PATH</label><input value={form.basePath} onChange={set('basePath')} placeholder="/home/files/downloads" /></div>
        <div className="row-actions" style={{ marginTop: 8 }}>
          <button className="btn btn--lime" type="submit">SAVE</button>
          <button className="btn btn--cyan" type="button" onClick={test}>TEST CONNECTION</button>
        </div>
      </form>

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
    </>
  );
}
