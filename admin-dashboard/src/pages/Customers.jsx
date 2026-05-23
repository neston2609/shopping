import { useEffect, useState } from 'react';
import { api } from '../api';

function CustomerModal({ id, onClose }) {
  const [c, setC] = useState(null);
  useEffect(() => { api.get(`/admin/customers/${id}`).then((d) => setC(d.customer)); }, [id]);
  if (!c) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{c.name || c.email}</h2>
        <div className="muted">{c.email} · {c.phone || 'no phone'} · {c.coins} coins</div>
        <div className="px" style={{ fontSize: 9, color: 'var(--cyan)', margin: '16px 0 8px' }}>ORDER HISTORY</div>
        <table>
          <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {c.orders.map((o) => (
              <tr key={o.id}><td>{o.orderNumber}</td><td>{o.itemCount}</td><td>฿{o.total.toFixed(2)}</td><td><span className={`badge ${o.status}`}>{o.status}</span></td><td className="muted">{new Date(o.createdAt).toLocaleDateString()}</td></tr>
            ))}
            {!c.orders.length && <tr><td colSpan={5} className="muted">No orders.</td></tr>}
          </tbody>
        </table>
        <button className="btn btn--ghost" style={{ marginTop: 16 }} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

export default function Customers() {
  const [data, setData] = useState({ customers: [] });
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const load = () => api.get(`/admin/customers?limit=100&q=${encodeURIComponent(q)}`).then(setData);
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <>
      <div className="toprow"><div className="h1">CUSTOMERS</div></div>
      <div className="toolbar">
        <input style={{ padding: 10, background: '#0b0220', border: '3px solid #fff', color: '#fff' }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button className="btn btn--cyan btn--sm" onClick={load}>SEARCH</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Coins</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {data.customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name || '—'}</td><td className="muted">{c.email}</td><td>{c.orderCount}</td><td>{c.coins}</td>
                <td className="muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td><button className="btn btn--cyan btn--sm" onClick={() => setOpenId(c.id)}>VIEW</button></td>
              </tr>
            ))}
            {!data.customers.length && <tr><td colSpan={6} className="muted">No customers.</td></tr>}
          </tbody>
        </table>
      </div>
      {openId && <CustomerModal id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
