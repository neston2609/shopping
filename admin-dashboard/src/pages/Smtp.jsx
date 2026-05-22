import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Smtp() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [testTo, setTestTo] = useState('');

  const load = () => api.get('/admin/smtp').then((d) => {
    setSettings(d.settings);
    setForm({ ...d.settings, password: '' });
  });
  useEffect(() => { load(); }, []);

  if (!form) return <div className="px">LOADING…</div>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    const payload = {
      host: form.host, port: Number(form.port), username: form.username || '',
      encryptionType: form.encryptionType, senderEmail: form.senderEmail || '', senderName: form.senderName || '',
      provider: form.provider, enabled: form.enabled,
    };
    if (form.password) payload.password = form.password;
    try {
      await api.put('/admin/smtp', payload);
      setMsg({ ok: true, text: 'Settings saved.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  const testConn = async () => {
    setMsg(null);
    try {
      const r = await api.post('/admin/smtp/test-connection');
      setMsg({ ok: r.ok, text: r.message });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };
  const testEmail = async () => {
    setMsg(null);
    try {
      const r = await api.post('/admin/smtp/test-email', { to: testTo });
      setMsg({ ok: r.ok, text: r.message });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <>
      <div className="toprow"><div className="h1">SMTP / EMAIL</div></div>
      <div className="note">{settings.gmailNote}</div>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}

      <form className="card" onSubmit={save} style={{ maxWidth: 720 }}>
        <label className="toggle" style={{ marginBottom: 14 }}><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> EMAIL NOTIFICATIONS ENABLED</label>
        <div className="grid2">
          <div className="field"><label>SMTP HOST</label><input value={form.host} onChange={set('host')} /></div>
          <div className="field"><label>SMTP PORT</label><input type="number" value={form.port} onChange={set('port')} /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>USERNAME (Gmail address)</label><input value={form.username || ''} onChange={set('username')} /></div>
          <div className="field"><label>PASSWORD (Gmail App Password)</label><input type="password" placeholder={settings.hasPassword ? '•••• already set' : 'not set'} value={form.password} onChange={set('password')} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>ENCRYPTION</label><select value={form.encryptionType} onChange={set('encryptionType')}><option value="tls">TLS</option><option value="ssl">SSL</option></select></div>
          <div className="field"><label>SENDER EMAIL</label><input value={form.senderEmail || ''} onChange={set('senderEmail')} /></div>
          <div className="field"><label>SENDER NAME</label><input value={form.senderName || ''} onChange={set('senderName')} /></div>
        </div>
        <button className="btn btn--lime">SAVE SETTINGS</button>
      </form>

      <div className="card" style={{ marginTop: 16, maxWidth: 720 }}>
        <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>TEST</div>
        <button className="btn btn--cyan btn--sm" onClick={testConn}>TEST CONNECTION</button>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="field"><label>SEND TEST EMAIL TO</label><input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" /></div>
          <div style={{ display: 'flex', alignItems: 'end' }}><button className="btn btn--gold btn--sm" onClick={testEmail} disabled={!testTo}>SEND TEST EMAIL</button></div>
        </div>
      </div>
    </>
  );
}
