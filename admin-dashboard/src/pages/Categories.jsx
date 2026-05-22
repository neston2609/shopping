import { useEffect, useState } from 'react';
import { api } from '../api';

const BLANK = { name: '', slug: '', description: '', imageColor: '#ff2e88', glyph: '', parentId: '' };

export default function Categories() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/admin/categories').then((d) => setList(d.categories || []));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form, parentId: form.parentId ? Number(form.parentId) : null };
    try {
      if (editingId) await api.put(`/admin/categories/${editingId}`, payload);
      else await api.post('/admin/categories', payload);
      setForm(BLANK);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, slug: c.slug, description: c.description || '', imageColor: c.imageColor || '#ff2e88', glyph: c.glyph || '', parentId: c.parentId || '' });
  };
  const remove = async (id) => {
    if (!confirm('Delete category?')) return;
    await api.del(`/admin/categories/${id}`);
    load();
  };

  return (
    <>
      <div className="toprow"><div className="h1">CATEGORIES</div></div>
      <div className="grid2">
        <div className="card">
          <table>
            <thead><tr><th>Name</th><th>Parent</th><th>Glyph</th><th>Products</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><span style={{ display: 'inline-block', width: 12, height: 12, background: c.imageColor, marginRight: 8, border: '2px solid #000' }} />{c.name}</td>
                  <td className="muted">{c.parentName || '—'}</td>
                  <td className="muted">{c.glyph}</td>
                  <td>{c.productCount}</td>
                  <td className="row-actions">
                    <button className="btn btn--cyan btn--sm" onClick={() => edit(c)}>EDIT</button>
                    <button className="btn btn--sm" onClick={() => remove(c.id)}>DEL</button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="muted">No categories.</td></tr>}
            </tbody>
          </table>
        </div>

        <form className="card" onSubmit={save}>
          <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>{editingId ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</div>
          {error && <div className="error-msg">{error}</div>}
          <div className="field"><label>NAME *</label><input value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label>SLUG (auto if blank)</label><input value={form.slug} onChange={set('slug')} /></div>
          <div className="field"><label>DESCRIPTION</label><input value={form.description} onChange={set('description')} /></div>
          <div className="grid2">
            <div className="field"><label>TILE COLOR</label><input type="color" value={form.imageColor} onChange={set('imageColor')} /></div>
            <div className="field"><label>GLYPH (CART/PAD…)</label><input value={form.glyph} onChange={set('glyph')} /></div>
          </div>
          <div className="field"><label>PARENT</label>
            <select value={form.parentId} onChange={set('parentId')}>
              <option value="">— top level —</option>
              {list.filter((c) => c.id !== editingId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--lime">{editingId ? 'UPDATE' : 'CREATE'}</button>
            {editingId && <button type="button" className="btn btn--ghost" onClick={() => { setEditingId(null); setForm(BLANK); }}>CANCEL</button>}
          </div>
        </form>
      </div>
    </>
  );
}
