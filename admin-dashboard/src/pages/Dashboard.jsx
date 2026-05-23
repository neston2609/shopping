import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-msg">{error}</div>;
  if (!stats) return <div className="px">LOADING…</div>;

  return (
    <>
      <div className="toprow"><div className="h1">DASHBOARD</div></div>
      <div className="cards">
        <div className="stat-card"><div className="k">REVENUE</div><div className="v">฿{stats.revenue.toFixed(0)}</div></div>
        <div className="stat-card"><div className="k">ORDERS</div><div className="v">{stats.orderCount}</div></div>
        <div className="stat-card"><div className="k">PRODUCTS</div><div className="v">{stats.productCount}</div></div>
        <div className="stat-card"><div className="k">CUSTOMERS</div><div className="v">{stats.customerCount}</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>RECENT ORDERS ({stats.pendingOrders} pending)</div>
          <table>
            <thead><tr><th>Order</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link to="/orders" style={{ color: 'var(--cyan)' }}>{o.orderNumber}</Link></td>
                  <td>฿{o.total.toFixed(2)}</td>
                  <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                </tr>
              ))}
              {!stats.recentOrders.length && <tr><td colSpan={3} className="muted">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="px" style={{ fontSize: 11, color: 'var(--magenta)', marginBottom: 12 }}>LOW STOCK ALERT</div>
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead>
            <tbody>
              {stats.lowStock.map((p) => (
                <tr key={p.id}><td>{p.name}</td><td className="muted">{p.sku}</td><td><span className="badge cancelled">{p.stock}</span></td></tr>
              ))}
              {!stats.lowStock.length && <tr><td colSpan={3} className="muted">All stocked up.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
