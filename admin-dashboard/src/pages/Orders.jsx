import { useEffect, useState } from 'react';
import { api } from '../api';

const STATUSES = ['', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'];

function OrderModal({ id, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [tracking, setTracking] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get(`/admin/orders/${id}`).then((d) => {
    setOrder(d.order);
    setStatus(d.order.status);
    setTracking(d.order.trackingNumber || '');
  });
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (!order) return null;

  const saveStatus = async () => {
    await api.patch(`/admin/orders/${id}/status`, { status });
    setMsg('Status updated — customer email queued.');
    onChanged();
    load();
  };
  const saveTracking = async () => {
    await api.patch(`/admin/orders/${id}/tracking`, { trackingNumber: tracking });
    setMsg('Tracking saved.');
    load();
  };
  const setPayment = async (s) => {
    await api.patch(`/admin/orders/${id}/payment`, { status: s });
    setMsg('Payment status updated.');
    onChanged();
    load();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>ORDER {order.orderNumber}</h2>
        {msg && <div className="success-msg">{msg}</div>}
        <div className="grid2">
          <div>
            <div className="muted px" style={{ fontSize: 8, color: 'var(--cyan)' }}>SHIP TO</div>
            <p style={{ marginTop: 6 }}>{order.shipping.name}<br />{order.shipping.line1}{order.shipping.line2 ? `, ${order.shipping.line2}` : ''}<br />{order.shipping.city} {order.shipping.state} {order.shipping.postalCode}<br />{order.shipping.country}</p>
            <div className="muted" style={{ marginTop: 8 }}>{order.customerEmail}</div>
          </div>
          <div>
            <div className="muted px" style={{ fontSize: 8, color: 'var(--cyan)' }}>PAYMENT</div>
            <p style={{ marginTop: 6 }}>{order.payment?.method?.toUpperCase()} — <span className={`badge ${order.payment?.status}`}>{order.payment?.status}</span></p>
            <div className="row-actions" style={{ marginTop: 8 }}>
              <button className="btn btn--lime btn--sm" onClick={() => setPayment('paid')}>MARK PAID</button>
              <button className="btn btn--sm" onClick={() => setPayment('refunded')}>REFUND</button>
            </div>
          </div>
        </div>

        <table style={{ marginTop: 16 }}>
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
          <tbody>
            {order.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${i.lineTotal.toFixed(2)}</td></tr>)}
          </tbody>
        </table>
        <div style={{ textAlign: 'right', marginTop: 10 }} className="px">TOTAL ${order.total.toFixed(2)}</div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="field"><label>ORDER STATUS</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ flex: 1 }}>
                {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn--lime btn--sm" onClick={saveStatus}>SET</button>
            </div>
          </div>
          <div className="field"><label>TRACKING #</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn--cyan btn--sm" onClick={saveTracking}>SAVE</button>
            </div>
          </div>
        </div>

        <button className="btn btn--ghost" style={{ marginTop: 16 }} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

export default function Orders() {
  const [data, setData] = useState({ orders: [] });
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = () => api.get(`/admin/orders?limit=100${status ? `&status=${status}` : ''}`).then(setData);
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  return (
    <>
      <div className="toprow"><div className="h1">ORDERS</div></div>
      <div className="toolbar">
        {STATUSES.map((s) => <span key={s || 'all'} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{s || 'ALL'}</span>)}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Order</th><th>Email</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td className="muted">{o.customerEmail}</td>
                <td>${o.total.toFixed(2)}</td>
                <td><span className={`badge ${o.payment?.status}`}>{o.payment?.status || '—'}</span></td>
                <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                <td className="muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td><button className="btn btn--cyan btn--sm" onClick={() => setOpenId(o.id)}>VIEW</button></td>
              </tr>
            ))}
            {!data.orders.length && <tr><td colSpan={7} className="muted">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
      {openId && <OrderModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
