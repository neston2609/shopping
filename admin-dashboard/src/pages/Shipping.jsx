import { useEffect, useState } from 'react';
import { api } from '../api';

const BLANK = { name: '', fee: 0, zone: '', estimate: '', enabled: true };

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
