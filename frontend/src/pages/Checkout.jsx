import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const STEPS = ['ADDRESS', 'SHIPPING', 'PAYMENT', 'CONFIRM'];

export default function Checkout() {
  const { cart, reload } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [freeShipping, setFreeShipping] = useState({ enabled: false, threshold: 0 });
  const [totals, setTotals] = useState({ subtotal: cart.subtotal, shippingFee: 0, discount: 0, total: cart.subtotal });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountMsg, setDiscountMsg] = useState(null);

  const [form, setForm] = useState({
    email: user?.email || '',
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
  });
  const [shippingMethodId, setShippingMethodId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    api.get('/shipping-methods').then((d) => {
      setShippingMethods(d.methods || []);
      if (d.freeShipping) setFreeShipping(d.freeShipping);
      if (d.methods?.length) setShippingMethodId(d.methods[0].id);
    });
    api.get('/payment-methods').then((d) => {
      setPaymentMethods(d.methods || []);
      if (d.methods?.length) setPaymentMethod(d.methods[0].method);
    });
  }, []);

  useEffect(() => {
    if (shippingMethodId) {
      api.post('/checkout/totals', { shippingMethodId, discountCode })
        .then(setTotals)
        .catch((e) => {
          // If the code became invalid (subtotal changed below min, expired, etc.)
          // drop it and recompute without it.
          if (discountCode) {
            setDiscountCode('');
            setDiscountMsg({ ok: false, text: e.message });
            api.post('/checkout/totals', { shippingMethodId }).then(setTotals).catch(() => {});
          }
        });
    }
  }, [shippingMethodId, cart.subtotal, discountCode]);

  const applyDiscount = async (e) => {
    e?.preventDefault();
    setDiscountMsg(null);
    if (!discountInput.trim()) return;
    try {
      const r = await api.post('/discount/validate', { code: discountInput.trim(), subtotal: cart.subtotal });
      setDiscountCode(r.code);
      setDiscountInput('');
      setDiscountMsg({ ok: true, text: `Code ${r.code} applied — saves ฿${r.discount.toFixed(2)}` });
    } catch (err) {
      setDiscountMsg({ ok: false, text: err.message });
    }
  };

  const clearDiscount = () => {
    setDiscountCode('');
    setDiscountMsg(null);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const next = () => {
    setError('');
    if (step === 0) {
      if (!form.email || !form.fullName || !form.line1 || !form.city || !form.postalCode || !form.country) {
        setError('Please fill in all required address fields.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      const { order } = await api.post('/checkout', {
        email: form.email,
        address: {
          fullName: form.fullName,
          phone: form.phone,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        shippingMethodId,
        paymentMethod,
        discountCode: discountCode || undefined,
      });
      await reload();
      navigate(`/order-confirmation/${order.orderNumber}`, { state: { order } });
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  if (!cart.items.length) {
    return <div className="container"><div className="empty-state">Your bag is empty. <a href="/shop">Go shopping →</a></div></div>;
  }

  return (
    <div className="container">
      <h1 className="page-title">▶ CHECKOUT</h1>
      <div className="steps">
        {STEPS.map((s, i) => <span key={s} className={`s ${i === step ? 'on' : ''}`}>{i + 1}. {s}</span>)}
      </div>

      <div className="checkout-grid">
        <div className="panel-box">
          {error && <div className="error-msg">{error}</div>}

          {step === 0 && (
            <>
              <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// SHIPPING ADDRESS</h3>
              <div className="field"><label>EMAIL *</label><input value={form.email} onChange={set('email')} /></div>
              <div className="field"><label>FULL NAME *</label><input value={form.fullName} onChange={set('fullName')} /></div>
              <div className="field"><label>PHONE</label><input value={form.phone} onChange={set('phone')} /></div>
              <div className="field"><label>ADDRESS LINE 1 *</label><input value={form.line1} onChange={set('line1')} /></div>
              <div className="field"><label>ADDRESS LINE 2</label><input value={form.line2} onChange={set('line2')} /></div>
              <div className="field"><label>CITY *</label><input value={form.city} onChange={set('city')} /></div>
              <div className="field"><label>STATE / REGION</label><input value={form.state} onChange={set('state')} /></div>
              <div className="field"><label>POSTAL CODE *</label><input value={form.postalCode} onChange={set('postalCode')} /></div>
              <div className="field"><label>COUNTRY *</label><input value={form.country} onChange={set('country')} /></div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// SHIPPING METHOD</h3>
              <div className="choice">
                {shippingMethods.map((m) => (
                  <label key={m.id} className={shippingMethodId === m.id ? 'on' : ''}>
                    <input type="radio" name="ship" checked={shippingMethodId === m.id} onChange={() => setShippingMethodId(m.id)} />
                    <span style={{ flex: 1 }}>{m.name} — {m.estimate} ({m.zone})</span>
                    <b style={{ color: 'var(--gold)' }}>{freeShipping.enabled && cart.subtotal >= freeShipping.threshold ? 'FREE' : `฿${m.fee.toFixed(2)}`}</b>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// PAYMENT METHOD</h3>
              <div className="choice">
                {paymentMethods.map((m) => (
                  <label key={m.method} className={paymentMethod === m.method ? 'on' : ''}>
                    <input type="radio" name="pay" checked={paymentMethod === m.method} onChange={() => setPaymentMethod(m.method)} />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
              <div className="muted" style={{ marginTop: 12 }}>
                Bank transfer shows the bank account + QR on the next page, where you upload your payment slip.
                Card / Stripe / PayPal are simulated (marked paid instantly). COD is collected on delivery.
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// CONFIRM ORDER</h3>
              <div className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
                <b style={{ color: '#fff' }}>SHIP TO</b><br />
                {form.fullName}<br />{form.line1}{form.line2 ? `, ${form.line2}` : ''}<br />
                {form.city} {form.state} {form.postalCode}<br />{form.country}<br />
                <span style={{ display: 'block', marginTop: 10 }}><b style={{ color: '#fff' }}>EMAIL</b> {form.email}</span>
                <span style={{ display: 'block', marginTop: 6 }}><b style={{ color: '#fff' }}>PAYMENT</b> {paymentMethod.toUpperCase()}</span>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {step > 0 && <button className="btn btn--ghost" onClick={() => setStep((s) => s - 1)}>◀ BACK</button>}
            {step < STEPS.length - 1 ? (
              <button className="btn btn--cyan" onClick={next}>NEXT ▶</button>
            ) : (
              <button className="btn btn--lime" onClick={placeOrder} disabled={placing}>{placing ? 'PLACING…' : '▶ PLACE ORDER'}</button>
            )}
          </div>
        </div>

        <div className="summary">
          <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// SUMMARY</h3>
          {cart.items.map((it) => (
            <div className="line" key={it.id}><span>{it.quantity}× {it.name.slice(0, 22)}</span><span>฿{it.lineTotal.toFixed(2)}</span></div>
          ))}
          <div className="line"><span>Subtotal</span><span>฿{totals.subtotal.toFixed(2)}</span></div>
          <div className="line"><span>Shipping</span><span>{totals.shippingFee === 0 ? 'FREE' : `฿${totals.shippingFee.toFixed(2)}`}</span></div>
          {totals.discount > 0 && (
            <div className="line" style={{ color: 'var(--lime)' }}>
              <span>Discount ({discountCode})<button type="button" className="chip" style={{ marginLeft: 8, padding: '3px 6px', fontSize: 8 }} onClick={clearDiscount}>✕</button></span>
              <span>−฿{totals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="line total"><span>TOTAL</span><span>฿{totals.total.toFixed(2)}</span></div>

          {!discountCode && (
            <form onSubmit={applyDiscount} style={{ marginTop: 14 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Have a discount code?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ flex: 1, padding: 10, background: 'var(--dark)', border: '2px solid var(--ink)', color: 'var(--ink)' }} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="WELCOME-XXXXX" />
                <button type="submit" className="btn btn--gold">APPLY</button>
              </div>
            </form>
          )}
          {discountMsg && <div className={discountMsg.ok ? 'success-msg' : 'error-msg'} style={{ marginTop: 8 }}>{discountMsg.text}</div>}
        </div>
      </div>
    </div>
  );
}
