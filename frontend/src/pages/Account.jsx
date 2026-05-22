import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const TABS = ['ORDERS', 'ADDRESSES', 'PROFILE'];

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/account/orders').then((d) => setOrders(d.orders || [])).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="loading">LOADING ORDERS…</div>;
  if (!orders.length) return <div className="empty-state">No orders yet. <Link to="/shop" style={{ color: 'var(--lime)' }}>Start a quest →</Link></div>;
  return (
    <div>
      {orders.map((o) => (
        <div className="panel-box" key={o.id} style={{ marginBottom: 16 }}>
          <div className="row-between">
            <div style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--gold)' }}>{o.orderNumber}</div>
            <span className={`badge-status ${o.status}`}>{o.status}</span>
          </div>
          <div className="muted" style={{ marginTop: 10 }}>{new Date(o.createdAt).toLocaleString()} · {o.items.length} items · ${o.total.toFixed(2)}</div>
          {o.trackingNumber && <div className="muted" style={{ marginTop: 6 }}>Tracking: {o.trackingNumber}</div>}
          <div style={{ marginTop: 10 }}>
            {o.items.map((i) => <div key={i.id} className="muted">{i.quantity}× {i.name} — ${i.lineTotal.toFixed(2)}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const blank = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'USA', isDefault: false };
  const [form, setForm] = useState(blank);
  const load = () => api.get('/account/addresses').then((d) => setAddresses(d.addresses || []));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'isDefault' ? e.target.checked : e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    await api.post('/account/addresses', form);
    setForm(blank);
    load();
  };
  const remove = async (id) => { await api.del(`/account/addresses/${id}`); load(); };
  return (
    <div className="checkout-grid">
      <div>
        {addresses.map((a) => (
          <div className="panel-box" key={a.id} style={{ marginBottom: 12 }}>
            <div className="row-between">
              <b style={{ color: '#fff' }}>{a.fullName} {a.isDefault ? '★' : ''}</b>
              <button className="chip" onClick={() => remove(a.id)}>✕</button>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.state} {a.postalCode}, {a.country}</div>
          </div>
        ))}
        {!addresses.length && <div className="muted">No saved addresses.</div>}
      </div>
      <form className="panel-box" onSubmit={save}>
        <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--gold)' }}>// ADD ADDRESS</h3>
        <div className="field"><label>FULL NAME</label><input value={form.fullName} onChange={set('fullName')} required /></div>
        <div className="field"><label>LINE 1</label><input value={form.line1} onChange={set('line1')} required /></div>
        <div className="field"><label>CITY</label><input value={form.city} onChange={set('city')} required /></div>
        <div className="field"><label>POSTAL CODE</label><input value={form.postalCode} onChange={set('postalCode')} required /></div>
        <div className="field"><label>COUNTRY</label><input value={form.country} onChange={set('country')} required /></div>
        <label className="muted" style={{ display: 'flex', gap: 8, marginTop: 10 }}><input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} /> Set as default</label>
        <button className="btn btn--lime" style={{ width: '100%', marginTop: 14 }}>SAVE ADDRESS</button>
      </form>
    </div>
  );
}

function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '' });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    await updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <form className="panel-box" onSubmit={save} style={{ maxWidth: 520 }}>
      {saved && <div className="success-msg">Profile saved.</div>}
      <div className="field"><label>EMAIL</label><input value={user.email} disabled /></div>
      <div className="field"><label>FIRST NAME</label><input value={form.firstName} onChange={set('firstName')} /></div>
      <div className="field"><label>LAST NAME</label><input value={form.lastName} onChange={set('lastName')} /></div>
      <div className="field"><label>PHONE</label><input value={form.phone} onChange={set('phone')} /></div>
      <div className="muted" style={{ marginTop: 12 }}>Pixel coins: <b style={{ color: 'var(--gold)' }}>{user.coins}</b></div>
      <button className="btn btn--lime" style={{ width: '100%', marginTop: 14 }}>SAVE</button>
    </form>
  );
}

export default function Account() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('ORDERS');
  if (loading) return <div className="loading">LOADING…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;

  return (
    <div className="container">
      <h1 className="page-title">▶ PLAYER PROFILE · {(user.firstName || 'PLAYER').toUpperCase()}</h1>
      <div className="steps">
        {TABS.map((t) => <span key={t} className={`s ${tab === t ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab(t)}>{t}</span>)}
      </div>
      <div style={{ marginTop: 18 }}>
        {tab === 'ORDERS' && <Orders />}
        {tab === 'ADDRESSES' && <Addresses />}
        {tab === 'PROFILE' && <Profile />}
      </div>
    </div>
  );
}
