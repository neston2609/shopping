import { useEffect, useState } from 'react';
import { api } from '../api';

// Which credential fields each method exposes.
const KEY_FIELDS = {
  card: ['gatewayMerchantId', 'gatewayApiKey'],
  stripe: ['publishableKey', 'secretKey'],
  paypal: ['clientId', 'clientSecret'],
  cod: [],
};

function MethodCard({ m, onSaved }) {
  const fields = KEY_FIELDS[m.method] || [];
  const [enabled, setEnabled] = useState(m.enabled);
  const [config, setConfig] = useState(() => Object.fromEntries(fields.map((f) => [f, ''])));
  const [msg, setMsg] = useState('');

  const save = async () => {
    const cleaned = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== ''));
    await api.put(`/admin/payments/${m.method}`, { enabled, config: Object.keys(cleaned).length ? cleaned : undefined });
    setMsg('Saved.');
    setTimeout(() => setMsg(''), 1500);
    onSaved();
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="toprow" style={{ marginBottom: 12 }}>
        <div className="px" style={{ fontSize: 12, color: '#fff' }}>{m.label}</div>
        <label className="toggle"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> {enabled ? 'ENABLED' : 'DISABLED'}</label>
      </div>
      {msg && <div className="success-msg">{msg}</div>}
      {fields.length > 0 && (
        <div className="grid2">
          {fields.map((f) => (
            <div className="field" key={f}>
              <label>{f}</label>
              <input type="password" placeholder={m.config?.[f] ? `set (${m.config[f]})` : 'not set'} value={config[f]} onChange={(e) => setConfig((c) => ({ ...c, [f]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}
      {m.method === 'cod' && <div className="muted">No API keys needed for cash on delivery.</div>}
      <button className="btn btn--lime btn--sm" style={{ marginTop: 10 }} onClick={save}>SAVE</button>
    </div>
  );
}

export default function Payments() {
  const [methods, setMethods] = useState([]);
  const load = () => api.get('/admin/payments').then((d) => setMethods(d.methods || []));
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="toprow"><div className="h1">PAYMENT METHODS</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>Enable methods and store API credentials (encrypted at rest). Keys are write-only — only the last 4 chars are shown.</div>
      {methods.map((m) => <MethodCard key={m.method} m={m} onSaved={load} />)}
      {!methods.length && <div className="muted">No payment methods configured.</div>}
    </>
  );
}
