import { useEffect, useState } from 'react';
import { api } from '../api';

const BLANK = {
  name: '', sku: '', description: '', price: '', discountPrice: '', stock: 0,
  status: 'active', rarity: 'common', platform: '', artVariant: 'cart-mag', categoryId: '',
  images: [], attributes: [],
};
const ART_VARIANTS = ['cart-mag', 'cart-cyn', 'cart-lim', 'cart-gld', 'cart-pur', 'cart-org'];

function ProductForm({ initial, categories, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...initial,
    price: initial?.price ?? '',
    discountPrice: initial?.discountPrice ?? '',
    categoryId: initial?.category?.id ?? '',
    images: initial?.images?.map((i) => ({ url: i.url, alt: i.alt || '', position: i.position || 0 })) || [],
    attributes: initial?.attributes?.map((a) => ({ name: a.name, value: a.value })) || [],
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setAttr = (idx, key, val) => setForm((f) => {
    const attributes = [...f.attributes];
    attributes[idx] = { ...attributes[idx], [key]: val };
    return { ...f, attributes };
  });
  const addAttr = () => setForm((f) => ({ ...f, attributes: [...f.attributes, { name: '', value: '' }] }));
  const removeAttr = (idx) => setForm((f) => ({ ...f, attributes: f.attributes.filter((_, i) => i !== idx) }));

  const setImg = (idx, val) => setForm((f) => {
    const images = [...f.images];
    images[idx] = { ...images[idx], url: val, position: idx };
    return { ...f, images };
  });
  const addImg = () => setForm((f) => ({ ...f, images: [...f.images, { url: '', alt: '', position: f.images.length }] }));
  const removeImg = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description || undefined,
      price: Number(form.price),
      discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
      stock: Number(form.stock),
      status: form.status,
      rarity: form.rarity,
      platform: form.platform || undefined,
      artVariant: form.artVariant || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      images: form.images.filter((i) => i.url),
      attributes: form.attributes.filter((a) => a.name && a.value),
    };
    try {
      if (initial?.id) await api.put(`/admin/products/${initial.id}`, payload);
      else await api.post('/admin/products', payload);
      onSaved();
    } catch (err) {
      setError(err.details ? err.details.map((d) => `${d.path}: ${d.message}`).join('; ') : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>{initial?.id ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</h2>
        {error && <div className="error-msg">{error}</div>}
        <div className="field"><label>NAME *</label><input value={form.name} onChange={set('name')} required /></div>
        <div className="grid2">
          <div className="field"><label>SKU *</label><input value={form.sku} onChange={set('sku')} required /></div>
          <div className="field"><label>CATEGORY</label>
            <select value={form.categoryId} onChange={set('categoryId')}>
              <option value="">— none —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>DESCRIPTION</label><textarea value={form.description} onChange={set('description')} /></div>
        <div className="grid3">
          <div className="field"><label>PRICE *</label><input type="number" step="0.01" value={form.price} onChange={set('price')} required /></div>
          <div className="field"><label>DISCOUNT PRICE</label><input type="number" step="0.01" value={form.discountPrice} onChange={set('discountPrice')} /></div>
          <div className="field"><label>STOCK</label><input type="number" value={form.stock} onChange={set('stock')} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>STATUS</label><select value={form.status} onChange={set('status')}><option value="active">active</option><option value="inactive">inactive</option></select></div>
          <div className="field"><label>RARITY</label><select value={form.rarity} onChange={set('rarity')}><option>common</option><option>rare</option><option>epic</option><option>legendary</option></select></div>
          <div className="field"><label>ART VARIANT</label><select value={form.artVariant} onChange={set('artVariant')}>{ART_VARIANTS.map((v) => <option key={v}>{v}</option>)}</select></div>
        </div>
        <div className="field"><label>PLATFORM TEXT</label><input value={form.platform} onChange={set('platform')} placeholder="SEGA-16 / 1992 / SEALED" /></div>

        <div className="field">
          <label>IMAGE URLS</label>
          {form.images.map((img, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input style={{ flex: 1 }} value={img.url} onChange={(e) => setImg(i, e.target.value)} placeholder="https://…" />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeImg(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn--cyan btn--sm" onClick={addImg}>+ ADD IMAGE</button>
        </div>

        <div className="field">
          <label>ATTRIBUTES (size, color, …)</label>
          {form.attributes.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input style={{ flex: 1 }} value={a.name} onChange={(e) => setAttr(i, 'name', e.target.value)} placeholder="name" />
              <input style={{ flex: 1 }} value={a.value} onChange={(e) => setAttr(i, 'value', e.target.value)} placeholder="value" />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeAttr(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn--cyan btn--sm" onClick={addAttr}>+ ADD ATTRIBUTE</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button className="btn btn--lime" disabled={busy}>{busy ? 'SAVING…' : 'SAVE'}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>CANCEL</button>
        </div>
      </form>
    </div>
  );
}

export default function Products() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => api.get(`/admin/products?q=${encodeURIComponent(q)}&limit=100`).then(setData);
  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { api.get('/admin/categories').then((d) => setCategories(d.categories || [])); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.del(`/admin/products/${id}`);
    load();
  };

  return (
    <>
      <div className="toprow">
        <div className="h1">PRODUCTS</div>
        <button className="btn btn--lime" onClick={() => setEditing({})}>+ NEW PRODUCT</button>
      </div>
      <div className="toolbar">
        <input className="field" style={{ padding: 10, background: '#0b0220', border: '3px solid #fff', color: '#fff' }} placeholder="Search name / SKU…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button className="btn btn--cyan btn--sm" onClick={load}>SEARCH</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Rarity</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="muted">{p.sku}</td>
                <td>฿{p.discountPrice ?? p.price}{p.discountPrice ? <span className="muted" style={{ textDecoration: 'line-through', marginLeft: 6 }}>฿{p.price}</span> : null}</td>
                <td>{p.stock}</td>
                <td><span className="badge">{p.rarity}</span></td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td className="row-actions">
                  <button className="btn btn--cyan btn--sm" onClick={() => setEditing(p)}>EDIT</button>
                  <button className="btn btn--sm" onClick={() => remove(p.id)}>DEL</button>
                </td>
              </tr>
            ))}
            {!data.items.length && <tr><td colSpan={7} className="muted">No products.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <ProductForm initial={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
