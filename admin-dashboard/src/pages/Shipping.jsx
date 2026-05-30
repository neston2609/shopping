import { useEffect, useState } from 'react';
import { api } from '../api';

const BLANK = { name: '', fee: 0, zone: '', estimate: '', enabled: true };

function PromoPanel() {
  const [promo, setPromo] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = () => api.get('/admin/shipping-promo').then((d) => setPromo(d.promo));
  useEffect(() => { load(); }, []);
  if (!promo) return null;
  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.put('/admin/shipping-promo', {
        freeShippingEnabled: !!promo.freeShippingEnabled,
        freeShippingThreshold: Number(promo.freeShippingThreshold) || 0,
      });
      setMsg({ ok: true, text: 'Shipping promo saved.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };
  return (
    <div className="card" style={{ marginBottom: 16, boxShadow: '4px 4px 0 var(--gold)', maxWidth: 720 }}>
      <div className="px" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 10 }}>SHIPPING PROMOTIONS</div>
      <div className="muted" style={{ marginBottom: 12 }}>Free shipping kicks in when the cart subtotal reaches the threshold. Set the threshold and toggle below.</div>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}
      <form onSubmit={save}>
        <label className="toggle" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={promo.freeShippingEnabled} onChange={(e) => setPromo({ ...promo, freeShippingEnabled: e.target.checked })} /> FREE SHIPPING PROMO ENABLED
        </label>
        <div className="field">
          <label>FREE SHIPPING THRESHOLD (฿)</label>
          <input type="number" min="0" step="0.01" value={promo.freeShippingThreshold} onChange={(e) => setPromo({ ...promo, freeShippingThreshold: e.target.value })} />
          <div className="muted" style={{ marginTop: 6 }}>Cart subtotal ≥ this amount → shipping is ฿0.</div>
        </div>
        <button className="btn btn--lime btn--sm" type="submit">SAVE PROMO</button>
      </form>
    </div>
  );
}

export default function Shipping() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);

  const load = () => api.get('/admin/shipping').then((d) => setList(d.methods || []));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, fee: Number(form.fee) };
    if (editingId) await api.put(`/admin/shipping/${editingId}`, payload);
    else await api.post('/admin/shipping', payload);
    setForm(BLANK); setEditingId(null); load();
  };
  const edit = (m) => { setEditingId(m.id); setForm({ name: m.name, fee: m.fee, zone: m.zone || '', estimate: m.estimate || '', enabled: m.enabled }); };
  const remove = async (id) => { if (confirm('Delete shipping method?')) { await api.del(`/admin/shipping/${id}`); load(); } };
  const toggle = async (m) => { await api.put(`/admin/shipping/${m.id}`, { ...m, enabled: !m.enabled }); load(); };

  return (
    <>
      <div className="toprow"><div className="h1">SHIPPING METHODS</div></div>
      <PromoPanel />
      <div className="grid2">
        <div className="card">
          <table>
            <thead><tr><th>Name</th><th>Fee</th><th>Zone</th><th>ETA</th><th>On</th><th></th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td><td>฿{m.fee.toFixed(2)}</td><td className="muted">{m.zone}</td><td className="muted">{m.estimate}</td>
                  <td><span className={`badge ${m.enabled ? 'active' : 'inactive'}`} style={{ cursor: 'pointer' }} onClick={() => toggle(m)}>{m.enabled ? 'ON' : 'OFF'}</span></td>
                  <td className="row-actions"><button className="btn btn--cyan btn--sm" onClick={() => edit(m)}>EDIT</button><button className="btn btn--sm" onClick={() => remove(m.id)}>DEL</button></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="muted">No methods.</td></tr>}
            </tbody>
          </table>
        </div>
        <form className="card" onSubmit={save}>
          <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>{editingId ? 'EDIT METHOD' : 'NEW METHOD'}</div>
          <div className="field"><label>NAME *</label><input value={form.name} onChange={set('name')} required /></div>
          <div className="grid2">
            <div className="field"><label>FEE ($)</label><input type="number" step="0.01" value={form.fee} onChange={set('fee')} /></div>
            <div className="field"><label>ZONE</label><input value={form.zone} onChange={set('zone')} placeholder="Worldwide" /></div>
          </div>
          <div className="field"><label>ETA</label><input value={form.estimate} onChange={set('estimate')} placeholder="1-2 days" /></div>
          <label className="toggle"><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> Enabled</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn--lime">{editingId ? 'UPDATE' : 'CREATE'}</button>
            {editingId && <button type="button" className="btn btn--ghost" onClick={() => { setEditingId(null); setForm(BLANK); }}>CANCEL</button>}
          </div>
        </form>
      </div>
    </>
  );
}
