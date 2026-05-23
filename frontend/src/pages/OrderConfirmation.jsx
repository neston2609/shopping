import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [order, setOrder] = useState(location.state?.order || null);

  useEffect(() => {
    if (user && orderNumber) {
      api.get(`/account/orders/${orderNumber}`).then((d) => setOrder(d.order)).catch(() => {});
    }
  }, [user, orderNumber]);

  return (
    <div className="container">
      <div className="panel-box" style={{ textAlign: 'center', boxShadow: '8px 8px 0 var(--lime)' }}>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 20, color: 'var(--lime)', textShadow: '3px 3px 0 #000' }}>★ QUEST COMPLETE ★</div>
        <p style={{ marginTop: 18, fontSize: 22 }}>Your order is in. A confirmation email is on its way.</p>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 14, color: 'var(--gold)', marginTop: 18 }}>ORDER {orderNumber}</div>
        {order && (
          <div style={{ marginTop: 16 }}>
            <span className={`badge-status ${order.status}`}>{order.status}</span>
            {order.total != null && <div style={{ marginTop: 14, fontFamily: 'Press Start 2P', fontSize: 16, color: 'var(--lime)' }}>฿{Number(order.total).toFixed(2)}</div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26 }}>
          {user && <Link className="btn btn--cyan" to="/account">VIEW ORDERS</Link>}
          <Link className="btn btn--lime" to="/shop">CONTINUE SHOPPING</Link>
        </div>
      </div>
    </div>
  );
}
