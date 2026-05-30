import { useEffect, useState } from 'react';
import { api } from '../api';

const BLANK = {
  code: '', description: '', type: 'percent', value: '', minSubtotal: 0,
  validFrom: '', validUntil: '', usageLimit: '', perUserLimit: 0, userId: '', enabled: true,
};

function isoToInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toISOString().slice(0, 16);
}

function CodeEditor({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...(initial || {}),
    value: initial?.value ?? '',
    minSubtotal: initial?.minSubtotal ?? 0,
    validFrom: isoToInput(initial?.validFrom),
    validUntil: isoToInput(initial?.validUntil),
    usageLimit: initial?.usageLimit ?? '',
    perUserLimit: initial?.perUserLimit ?? 0,
    userId: initial?.userId ?? '',
  }));
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description,
        type: form.type,
        value: Number(form.value),
        minSubtotal: Number(form.minSubtotal) || 0,
        validFrom: form.validFrom || '',
        validUntil: form.validUntil || '',
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        perUserLimit: Number(form.perUserLimit) || 0,
        userId: form.userId === '' ? null : Number(form.userId),
        enabled: !!form.enabled,
      };
      const r = initial?.id ? await api.put(`/admin/discounts/${initial.id}`, payload) : await api.post('/admin/discounts', payload);
      onSaved(r.code);
    } catch (err) {
      setMsg({ ok: false, text: err.details ? err.details.map((d) => `${d.path}: ${d.message}`).join('; ') : err.message });
    }
  };

  return (
    <div className="card" style={{ marginBottom: 12, boxShadow: '4px 4px 0 var(--cyan)' }}>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}
      <form onSubmit={save}>
        <div className="grid2">
          <div className="field"><label>CODE *</label><input value={form.code} onChange={set('code')} placeholder="WELCOME15" required style={{ textTransform: 'uppercase' }} /></div>
          <div className="field"><label>DESCRIPTION</label><input value={form.description} onChange={set('description')} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>TYPE</label><select value={form.type} onChange={set('type')}><option value="percent">Percent (%)</option><option value="fixed">Fixed amount (฿)</option></select></div>
          <div className="field"><label>VALUE *</label><input type="number" step="0.01" min="0" value={form.value} onChange={set('value')} required placeholder={form.type === 'percent' ? '15 (means 15%)' : '100 (means ฿100 off)'} /></div>
          <div className="field"><label>MIN SUBTOTAL (฿)</label><input type="number" step="0.01" min="0" value={form.minSubtotal} onChange={set('minSubtotal')} /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>VALID FROM</label><input type="datetime-local" value={form.validFrom} onChange={set('validFrom')} /></div>
          <div className="field"><label>VALID UNTIL</label><input type="datetime-local" value={form.validUntil} onChange={set('validUntil')} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>USAGE LIMIT (total)</label><input type="number" min="0" value={form.usageLimit} onChange={set('usageLimit')} placeholder="blank = unlimited" /></div>
          <div className="field"><label>PER-USER LIMIT (0 = unlimited)</label><input type="number" min="0" value={form.perUserLimit} onChange={set('perUserLimit')} /></div>
          <div className="field"><label>RESTRICT TO USER ID</label><input type="number" min="0" value={form.userId} onChange={set('userId')} placeholder="blank = anyone" /></div>
        </div>
        <label className="toggle" style={{ marginTop: 6 }}><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> {form.enabled ? 'ENABLED' : 'DISABLED'}</label>
        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn btn--lime" type="submit">{initial?.id ? 'UPDATE' : 'CREATE'}</button>
          {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>CANCEL</button>}
        </div>
      </form>
    </div>
  );
}

export default function Discounts() {
  const [codes, setCodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const load = () => api.get('/admin/discounts').then((d) => setCodes(d.codes || []));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this discount code? Past redemptions stay logged.')) return;
    await api.del(`/admin/discounts/${id}`);
    load();
  };

  return (
    <>
      <div className="toprow">
        <div className="h1">DISCOUNT CODES</div>
        <button className="btn btn--lime" onClick={() => setEditingId('new')}>+ NEW CODE</button>
      </div>
      <div className="muted" style={{ marginBottom: 16 }}>Create promo codes (percent off or fixed amount), set a minimum order, validity period, usage caps, or restrict to one user (welcome codes are issued this way automatically on register).</div>

      {editingId === 'new' && (
        <CodeEditor onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
      )}

      <div className="card">
        <table>
          <thead><tr><th>Code</th><th>Type / Value</th><th>Min ฿</th><th>Valid</th><th>Uses</th><th>User</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {codes.map((c) => (
              editingId === c.id ? (
                <tr key={c.id}><td colSpan={8}><CodeEditor initial={c} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} /></td></tr>
              ) : (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'VT323, monospace', fontSize: 18 }}>{c.code}</td>
                  <td>{c.type === 'percent' ? `${c.value}%` : `฿${c.value.toFixed(2)}`}</td>
                  <td>฿{Number(c.minSubtotal).toFixed(2)}</td>
                  <td className="muted" style={{ fontSize: 14 }}>
                    {c.validFrom ? new Date(c.validFrom).toLocaleDateString() : '—'} → {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '∞'}
                  </td>
                  <td>{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                  <td className="muted">{c.userEmail || 'anyone'}</td>
                  <td><span className={`badge ${c.enabled ? 'active' : 'inactive'}`}>{c.enabled ? 'ON' : 'OFF'}</span></td>
                  <td className="row-actions">
                    <button className="btn btn--cyan btn--sm" onClick={() => setEditingId(c.id)}>EDIT</button>
                    <button className="btn btn--sm" onClick={() => remove(c.id)}>DEL</button>
                  </td>
                </tr>
              )
            ))}
            {!codes.length && <tr><td colSpan={8} className="muted">No discount codes yet. Click "+ NEW CODE" to create one.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
