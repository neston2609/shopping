import { useEffect, useState } from 'react';
import { api, getToken } from '../api';

// Which credential fields each method exposes.
const KEY_FIELDS = {
  card: ['gatewayMerchantId', 'gatewayApiKey'],
  stripe: ['publishableKey', 'secretKey'],
  paypal: ['clientId', 'clientSecret'],
  cod: [],
  bank_transfer: [],
};

function MethodCard({ m, onSaved }) {
  const fields = KEY_FIELDS[m.method] || [];
  const isBank = m.method === 'bank_transfer';
  const [enabled, setEnabled] = useState(m.enabled);
  const [config, setConfig] = useState(() => Object.fromEntries(fields.map((f) => [f, ''])));
  const [bank, setBank] = useState({
    bankName: m.bankName || '',
    bankAccountName: m.bankAccountName || '',
    bankAccountNumber: m.bankAccountNumber || '',
    bankBranch: m.bankBranch || '',
    bankInstructions: m.bankInstructions || '',
  });
  const [qrPreview, setQrPreview] = useState(m.qrImageUrl || null);
  const [msg, setMsg] = useState('');

  const setB = (k) => (e) => setBank((b) => ({ ...b, [k]: e.target.value }));

  const save = async () => {
    const payload = { enabled };
    if (fields.length) {
      const cleaned = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== ''));
      if (Object.keys(cleaned).length) payload.config = cleaned;
    }
    if (isBank) Object.assign(payload, bank);
    await api.put(`/admin/payments/${m.method}`, payload);
    setMsg('Saved.');
    setTimeout(() => setMsg(''), 1500);
    onSaved();
  };

  const uploadQr = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('qr', file);
    const res = await fetch(`/api/admin/payments/${m.method}/qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || 'QR upload failed');
      return;
    }
    setQrPreview(data.method.qrImageUrl);
    setMsg('QR uploaded.');
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

      {isBank && (
        <>
          <div className="grid2">
            <div className="field"><label>BANK NAME</label><input value={bank.bankName} onChange={setB('bankName')} /></div>
            <div className="field"><label>ACCOUNT NAME</label><input value={bank.bankAccountName} onChange={setB('bankAccountName')} /></div>
            <div className="field"><label>ACCOUNT NUMBER</label><input value={bank.bankAccountNumber} onChange={setB('bankAccountNumber')} /></div>
            <div className="field"><label>BRANCH</label><input value={bank.bankBranch} onChange={setB('bankBranch')} /></div>
          </div>
          <div className="field"><label>INSTRUCTIONS (shown to customer)</label><textarea style={{ minHeight: 70 }} value={bank.bankInstructions} onChange={setB('bankInstructions')} /></div>
          <div className="field">
            <label>QR CODE IMAGE</label>
            {qrPreview && <img src={qrPreview} alt="QR" style={{ width: 160, border: '3px solid #fff', marginBottom: 8 }} />}
            <input type="file" accept="image/*" onChange={(e) => uploadQr(e.target.files[0])} />
          </div>
        </>
      )}

      {m.method === 'cod' && <div className="muted">No configuration needed for cash on delivery.</div>}
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
      <div className="muted" style={{ marginBottom: 16 }}>Enable methods, store API credentials (encrypted), and configure Bank Transfer details + QR shown to customers.</div>
      {methods.map((m) => <MethodCard key={m.method} m={m} onSaved={load} />)}
      {!methods.length && <div className="muted">No payment methods configured.</div>}
    </>
  );
}
