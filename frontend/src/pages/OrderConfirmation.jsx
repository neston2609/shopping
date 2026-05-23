import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

const STATUS = {
  awaiting_payment: { label: 'AWAITING PAYMENT', color: 'var(--gold)' },
  payment_review: { label: 'PAYMENT UNDER REVIEW', color: 'var(--cyan)' },
  awaiting_shipment: { label: 'PAYMENT CONFIRMED · PREPARING SHIPMENT', color: 'var(--lime)' },
  shipped: { label: 'SHIPPED', color: 'var(--cyan)' },
  delivered: { label: 'DELIVERED', color: 'var(--lime)' },
  cancelled: { label: 'CANCELLED', color: 'var(--magenta)' },
};

function BankPanel({ order, onUploaded }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const bank = order.bank || {};
  const apiBase = import.meta.env.VITE_API_URL || '/api';

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMsg({ ok: false, text: 'Choose your payment slip image first.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('slip', file);
      if (note) fd.append('payerNote', note);
      const res = await fetch(`${apiBase}/orders/${order.orderNumber}/slip`, { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMsg({ ok: true, text: 'Slip uploaded! We will verify your payment and start your shipment.' });
      onUploaded();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-box" style={{ marginTop: 20, textAlign: 'left' }}>
      <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// BANK TRANSFER</h3>
      <p className="muted" style={{ marginTop: 10 }}>
        Transfer exactly <b style={{ color: 'var(--lime)' }}>฿{order.total.toFixed(2)}</b> to:
      </p>
      <div style={{ border: '3px dashed var(--cyan)', padding: 14, margin: '12px 0', lineHeight: 1.7 }}>
        <div>BANK: <b style={{ color: '#fff' }}>{bank.bankName}</b></div>
        <div>ACCOUNT NAME: <b style={{ color: '#fff' }}>{bank.bankAccountName}</b></div>
        <div>ACCOUNT NO.: <b style={{ color: 'var(--gold)' }}>{bank.bankAccountNumber}</b></div>
        {bank.bankBranch ? <div>BRANCH: {bank.bankBranch}</div> : null}
      </div>
      {bank.bankInstructions ? <p className="muted">{bank.bankInstructions}</p> : null}
      {bank.qrImageUrl ? (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <img src={bank.qrImageUrl} alt="Payment QR" style={{ maxWidth: 220, border: '3px solid #fff' }} />
        </div>
      ) : null}

      <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--lime)', marginTop: 18 }}>// UPLOAD PAYMENT SLIP</h3>
      {order.slipUrl ? <div className="muted" style={{ marginTop: 8 }}>A slip is already uploaded — re-upload below if you need to replace it.</div> : null}
      {msg ? <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div> : null}
      <form onSubmit={submit}>
        <div className="field"><label>PAYMENT SLIP (image)</label><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></div>
        <div className="field"><label>NOTE (optional — transfer time / amount)</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button className="btn btn--lime" disabled={busy}>{busy ? 'UPLOADING…' : '▶ UPLOAD SLIP'}</button>
      </form>
    </div>
  );
}

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get(`/orders/lookup/${orderNumber}`).then((d) => setOrder(d.order)).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, [orderNumber]); // eslint-disable-line

  if (err) return <div className="container"><div className="error-msg">{err}</div></div>;
  if (!order) return <div className="loading">LOADING ORDER…</div>;

  const st = STATUS[order.status] || { label: order.status, color: 'var(--ink-dim)' };
  const isBankPending = order.paymentMethod === 'bank_transfer' && ['awaiting_payment', 'payment_review'].includes(order.status);

  return (
    <div className="container">
      <div className="panel-box" style={{ textAlign: 'center', boxShadow: '8px 8px 0 var(--lime)' }}>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 20, color: 'var(--lime)', textShadow: '3px 3px 0 #000' }}>★ ORDER PLACED ★</div>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 14, color: 'var(--gold)', marginTop: 16 }}>ORDER {order.orderNumber}</div>
        <div style={{ marginTop: 12 }}>
          <span style={{ fontFamily: 'Press Start 2P', fontSize: 9, padding: '6px 10px', border: `2px solid ${st.color}`, color: st.color, background: '#000' }}>{st.label}</span>
        </div>
        <div style={{ marginTop: 14, fontFamily: 'Press Start 2P', fontSize: 16, color: 'var(--lime)' }}>฿{order.total.toFixed(2)}</div>
        {order.trackingNumber ? <div className="muted" style={{ marginTop: 10 }}>Tracking: {order.trackingNumber}</div> : null}

        {isBankPending ? <BankPanel order={order} onUploaded={load} /> : null}

        {order.paymentMethod === 'bank_transfer' && order.status === 'awaiting_shipment' ? (
          <div className="success-msg" style={{ marginTop: 16 }}>Payment confirmed! We're preparing your shipment.</div>
        ) : null}
        {order.status === 'payment_review' ? (
          <div className="muted" style={{ marginTop: 12 }}>Thanks! Your slip is being reviewed — you'll get an email once it's approved.</div>
        ) : null}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26 }}>
          <Link className="btn btn--lime" to="/shop">CONTINUE SHOPPING</Link>
        </div>
      </div>
    </div>
  );
}
