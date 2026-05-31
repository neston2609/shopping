import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = {
  pending: 'PENDING',
  awaiting_payment: 'AWAITING PAYMENT',
  payment_review: 'PAYMENT UNDER REVIEW',
  awaiting_shipment: 'PAID · PREPARING SHIPMENT',
  paid: 'PAID',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
};
const STATUS_COLOR = {
  pending: 'var(--gold)',
  awaiting_payment: 'var(--gold)',
  payment_review: 'var(--cyan)',
  awaiting_shipment: 'var(--lime)',
  paid: 'var(--lime)',
  shipped: 'var(--cyan)',
  delivered: 'var(--lime)',
  cancelled: 'var(--magenta)',
};

const FILTERS = [
  { key: 'all',         label: 'ALL' },
  { key: 'open',        label: 'ACTIVE',  match: (o) => !['delivered', 'cancelled'].includes(o.status) },
  { key: 'awaiting',    label: 'AWAITING PAYMENT', match: (o) => o.status === 'awaiting_payment' || (o.status === 'pending' && o.payment?.status === 'pending') },
  { key: 'review',      label: 'IN REVIEW', match: (o) => o.status === 'payment_review' },
  { key: 'shipped',     label: 'SHIPPED', match: (o) => o.status === 'shipped' },
  { key: 'completed',   label: 'COMPLETED', match: (o) => o.status === 'delivered' },
];

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    api.get('/account/orders').then((d) => setOrders(d.orders || [])).finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="loading">LOADING…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/orders' }} replace />;

  const f = FILTERS.find((x) => x.key === filter) || FILTERS[0];
  const filtered = f.match ? orders.filter(f.match) : orders;
  const counts = {};
  FILTERS.forEach((x) => { counts[x.key] = x.match ? orders.filter(x.match).length : orders.length; });

  return (
    <div className="container">
      <h1 className="page-title">▶ MY ORDERS</h1>
      <div className="muted">View your past orders and finish paying for any that are still awaiting your payment slip.</div>

      <div className="steps" style={{ marginTop: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((x) => (
          <span key={x.key} className={`s ${filter === x.key ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilter(x.key)}>
            {x.label} <small style={{ opacity: 0.7 }}>({counts[x.key]})</small>
          </span>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div className="loading">LOADING ORDERS…</div>
        ) : !filtered.length ? (
          <div className="empty-state">
            {orders.length === 0 ? (
              <>No orders yet. <Link to="/shop" style={{ color: 'var(--lime)' }}>Start a quest →</Link></>
            ) : (
              <>Nothing in <b style={{ color: 'var(--cyan)' }}>{f.label}</b>. <button className="chip" onClick={() => setFilter('all')}>SHOW ALL</button></>
            )}
          </div>
        ) : (
          filtered.map((o) => {
            const statusLabel = STATUS_LABEL[o.status] || (o.status || '').toUpperCase();
            const statusColor = STATUS_COLOR[o.status] || 'var(--ink-dim)';
            const isBank = o.payment?.method === 'bank_transfer';
            const needSlip = isBank && (o.status === 'awaiting_payment' || (o.status === 'pending' && o.payment?.status === 'pending'));
            const reviewing = isBank && o.status === 'payment_review';
            const open = openId === o.id;
            return (
              <div className="panel-box" key={o.id} style={{ marginBottom: 16 }}>
                <div className="row-between">
                  <div style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--gold)' }}>{o.orderNumber}</div>
                  <span style={{ fontFamily: 'Press Start 2P', fontSize: 9, padding: '4px 8px', border: `2px solid ${statusColor}`, color: statusColor, background: '#000' }}>{statusLabel}</span>
                </div>
                <div className="muted" style={{ marginTop: 10 }}>
                  {new Date(o.createdAt).toLocaleString()} · {o.items.length} item{o.items.length === 1 ? '' : 's'} · <b style={{ color: 'var(--lime)' }}>฿{o.total.toFixed(2)}</b>
                </div>
                {o.trackingNumber && <div className="muted" style={{ marginTop: 6 }}>Tracking: <b style={{ color: '#fff' }}>{o.trackingNumber}</b></div>}
                {o.payment && (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Payment: <b style={{ color: '#fff' }}>{o.payment.method?.replace(/_/g, ' ').toUpperCase()}</b>
                    {' · '}<span style={{ color: o.payment.status === 'paid' ? 'var(--lime)' : o.payment.status === 'submitted' ? 'var(--cyan)' : 'var(--gold)' }}>{(o.payment.status || '').toUpperCase()}</span>
                  </div>
                )}

                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {needSlip && (
                    <Link className="btn btn--lime btn--sm" to={`/order-confirmation/${o.orderNumber}`}>
                      ▶ PAY / UPLOAD SLIP
                    </Link>
                  )}
                  {reviewing && (
                    <Link className="btn btn--cyan btn--sm" to={`/order-confirmation/${o.orderNumber}`}>
                      RE-UPLOAD SLIP
                    </Link>
                  )}
                  <Link className="btn btn--ghost btn--sm" to={`/order-confirmation/${o.orderNumber}`}>VIEW</Link>
                  <button className="btn btn--ghost btn--sm" onClick={() => setOpenId(open ? null : o.id)}>
                    {open ? '▴ HIDE ITEMS' : '▾ SHOW ITEMS'}
                  </button>
                </div>

                {open && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px dashed var(--ink-dim)' }}>
                    {o.items.map((i) => <div key={i.id} className="muted">{i.quantity}× {i.name} — ฿{i.lineTotal.toFixed(2)}</div>)}
                    {o.shipping && (
                      <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
                        <b style={{ color: '#fff' }}>SHIP TO</b><br />
                        {o.shipping.name}{o.shipping.phone ? ` · ${o.shipping.phone}` : ''}<br />
                        {o.shipping.line1}{o.shipping.line2 ? `, ${o.shipping.line2}` : ''}<br />
                        {o.shipping.city} {o.shipping.state} {o.shipping.postalCode}<br />
                        {o.shipping.country}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
