import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';

const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const SORTS = [
  { v: 'newest', l: 'NEWEST' },
  { v: 'price_asc', l: 'PRICE ↑' },
  { v: 'price_desc', l: 'PRICE ↓' },
  { v: 'name', l: 'NAME A-Z' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const rarity = params.get('rarity') || '';
  const sort = params.get('sort') || 'newest';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const page = params.get('page') || '1';

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    if (rarity) qs.set('rarity', rarity);
    if (sort) qs.set('sort', sort);
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    qs.set('page', page);
    api
      .get(`/products?${qs.toString()}`)
      .then((d) => setData(d))
      .catch(() => setData({ items: [], total: 0, totalPages: 1, page: 1 }))
      .finally(() => setLoading(false));
  }, [q, category, rarity, sort, minPrice, maxPrice, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div className="container">
      <h1 className="page-title">▶ INVENTORY {q ? `// SEARCH "${q}"` : ''}</h1>
      <div className="muted">{data.total} items found</div>

      <div className="shop-layout">
        <aside className="filters">
          <h4>// CATEGORIES</h4>
          <div className={`cat-link ${!category ? 'on' : ''}`} onClick={() => setParam('category', '')}>All worlds</div>
          {categories.map((c) => (
            <div key={c.id} className={`cat-link ${category === c.slug ? 'on' : ''}`} onClick={() => setParam('category', c.slug)}>
              {c.name} ({c.productCount ?? 0})
            </div>
          ))}

          <h4 style={{ marginTop: 20 }}>// RARITY</h4>
          <div className={`cat-link ${!rarity ? 'on' : ''}`} onClick={() => setParam('rarity', '')}>Any</div>
          {RARITIES.map((r) => (
            <div key={r} className={`cat-link ${rarity === r ? 'on' : ''}`} onClick={() => setParam('rarity', r)}>{r.toUpperCase()}</div>
          ))}

          <h4 style={{ marginTop: 20 }}>// PRICE</h4>
          <div className="field" style={{ marginTop: 6 }}>
            <input type="number" placeholder="Min $" defaultValue={minPrice} onBlur={(e) => setParam('minPrice', e.target.value)} />
          </div>
          <div className="field">
            <input type="number" placeholder="Max $" defaultValue={maxPrice} onBlur={(e) => setParam('maxPrice', e.target.value)} />
          </div>
        </aside>

        <div>
          <div className="toolbar" style={{ marginTop: 0 }}>
            <div className="sep" />
            <div className="sort">
              SORT BY
              {SORTS.map((s) => (
                <span key={s.v} className={`chip ${sort === s.v ? 'on' : ''}`} onClick={() => setParam('sort', s.v)}>{s.l}</span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading">LOADING LOOT…</div>
          ) : data.items.length === 0 ? (
            <div className="empty-state">No items match your quest. Try clearing filters.</div>
          ) : (
            <div className="grid-3" style={{ marginTop: 24 }}>
              {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {data.totalPages > 1 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 30 }}>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
                <span key={n} className={`chip ${String(n) === String(data.page) ? 'on' : ''}`} onClick={() => setParam('page', String(n))}>{n}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
