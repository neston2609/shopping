import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const TABS = ['ADDRESSES', 'PROFILE'];

// ----- Addresses -----
const BLANK_ADDR = { label: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'Thailand', isDefault: false };

function AddressForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || BLANK_ADDR);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'isDefault' ? e.target.checked : e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (initial?.id) {
        await api.patch(`/account/addresses/${initial.id}`, form);
      } else {
        await api.post('/account/addresses', form);
      }
      onSaved();
    } catch (ex) {
      setErr(ex.details ? ex.details.map((d) => d.message).join('; ') : ex.message);
    } finally { setBusy(false); }
  };
  return (
    <form className="panel-box" onSubmit={submit}>
      <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--gold)' }}>// {initial?.id ? 'EDIT ADDRESS' : 'ADD ADDRESS'}</h3>
      {err && <div className="error-msg">{err}</div>}
      <div className="field"><label>LABEL (optional — "Home", "Office")</label><input value={form.label || ''} onChange={set('label')} /></div>
      <div className="field"><label>FULL NAME *</label><input value={form.fullName} onChange={set('fullName')} required /></div>
      <div className="field"><label>PHONE</label><input value={form.phone || ''} onChange={set('phone')} /></div>
      <div className="field"><label>ADDRESS LINE 1 *</label><input value={form.line1} onChange={set('line1')} required /></div>
      <div className="field"><label>ADDRESS LINE 2</label><input value={form.line2 || ''} onChange={set('line2')} /></div>
      <div className="field"><label>CITY *</label><input value={form.city} onChange={set('city')} required /></div>
      <div className="field"><label>STATE / REGION</label><input value={form.state || ''} onChange={set('state')} /></div>
      <div className="field"><label>POSTAL CODE *</label><input value={form.postalCode} onChange={set('postalCode')} required /></div>
      <div className="field"><label>COUNTRY *</label><input value={form.country} onChange={set('country')} required /></div>
      <label className="muted" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input type="checkbox" checked={!!form.isDefault} onChange={set('isDefault')} /> Set as default
      </label>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn btn--lime" disabled={busy} style={{ flex: 1 }}>{busy ? 'SAVING…' : (initial?.id ? 'UPDATE' : 'SAVE ADDRESS')}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>CANCEL</button>}
      </div>
    </form>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null); // 'new', id, or null
  const load = () => api.get('/account/addresses').then((d) => setAddresses(d.addresses || []));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Remove this address?')) return;
    await api.del(`/account/addresses/${id}`);
    load();
  };

  return (
    <div className="checkout-grid">
      <div>
        {addresses.map((a) => (
          editing === a.id ? (
            <div key={a.id} style={{ marginBottom: 12 }}>
              <AddressForm initial={a} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
            </div>
          ) : (
            <div className="panel-box" key={a.id} style={{ marginBottom: 12 }}>
              <div className="row-between">
                <b style={{ color: '#fff' }}>{a.fullName} {a.isDefault ? <span style={{ color: 'var(--gold)' }}>★ DEFAULT</span> : ''}</b>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="chip" onClick={() => setEditing(a.id)} title="Edit">EDIT</button>
                  <button className="chip" onClick={() => remove(a.id)} title="Remove">✕</button>
                </div>
              </div>
              {a.label && <div className="muted" style={{ marginTop: 6, color: 'var(--cyan)' }}>{a.label}</div>}
              <div className="muted" style={{ marginTop: 6 }}>
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>
                {a.city} {a.state} {a.postalCode}<br/>
                {a.country}
                {a.phone && <><br/>📞 {a.phone}</>}
              </div>
            </div>
          )
        ))}
        {!addresses.length && <div className="muted">No saved addresses yet. Add one →</div>}
        {editing !== 'new' && (
          <button className="btn btn--cyan btn--sm" onClick={() => setEditing('new')}>+ NEW ADDRESS</button>
        )}
      </div>
      {editing === 'new' && (
        <AddressForm onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}

function Profile() {
  const { user, updateProfile, updateCredentials } = useAuth();
  const [form, setForm] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '' });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    await updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [cred, setCred] = useState({ currentPassword: '', newEmail: '', newUsername: '', newPassword: '' });
  const [credMsg, setCredMsg] = useState(null);
  const setC = (k) => (e) => setCred((c) => ({ ...c, [k]: e.target.value }));
  const saveCreds = async (e) => {
    e.preventDefault();
    setCredMsg(null);
    try {
      const payload = { currentPassword: cred.currentPassword };
      if (cred.newEmail) payload.newEmail = cred.newEmail.trim();
      if (cred.newUsername !== '') payload.newUsername = cred.newUsername.trim();
      if (cred.newPassword) payload.newPassword = cred.newPassword;
      await updateCredentials(payload);
      setCred({ currentPassword: '', newEmail: '', newUsername: '', newPassword: '' });
      setCredMsg({ ok: true, text: 'Credentials updated.' });
    } catch (err) {
      setCredMsg({ ok: false, text: err.details ? err.details.map((d) => d.message).join('; ') : err.message });
    }
  };

  return (
    <div className="checkout-grid">
      <form className="panel-box" onSubmit={save}>
        <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--gold)' }}>// PROFILE</h3>
        {saved && <div className="success-msg">Profile saved.</div>}
        <div className="field"><label>EMAIL</label><input value={user.email} disabled /></div>
        <div className="field"><label>USERNAME</label><input value={user.username || '—'} disabled /></div>
        <div className="field"><label>FIRST NAME</label><input value={form.firstName} onChange={set('firstName')} /></div>
        <div className="field"><label>LAST NAME</label><input value={form.lastName} onChange={set('lastName')} /></div>
        <div className="field"><label>PHONE</label><input value={form.phone} onChange={set('phone')} /></div>
        <div className="muted" style={{ marginTop: 12 }}>Pixel coins: <b style={{ color: 'var(--gold)' }}>{user.coins}</b></div>
        <button className="btn btn--lime" style={{ width: '100%', marginTop: 14 }}>SAVE PROFILE</button>
      </form>

      <form className="panel-box" onSubmit={saveCreds} style={{ boxShadow: '4px 4px 0 var(--magenta)' }}>
        <h3 style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--magenta)' }}>// CHANGE EMAIL / USERNAME / PASSWORD</h3>
        <div className="muted" style={{ marginTop: 6 }}>Enter your current password to confirm, then fill in only what you want to change.</div>
        {credMsg && <div className={credMsg.ok ? 'success-msg' : 'error-msg'}>{credMsg.text}</div>}
        <div className="field"><label>CURRENT PASSWORD *</label><input type="password" value={cred.currentPassword} onChange={setC('currentPassword')} required autoComplete="current-password" /></div>
        <div className="field"><label>NEW EMAIL</label><input type="email" value={cred.newEmail} onChange={setC('newEmail')} placeholder={user.email} /></div>
        <div className="field"><label>NEW USERNAME (3-30 chars; clear to remove)</label><input value={cred.newUsername} onChange={setC('newUsername')} placeholder={user.username || ''} /></div>
        <div className="field"><label>NEW PASSWORD (min 8 chars)</label><input type="password" value={cred.newPassword} onChange={setC('newPassword')} autoComplete="new-password" /></div>
        <button className="btn btn--magenta" style={{ width: '100%', marginTop: 14, background: 'var(--magenta)', color: '#fff' }}>UPDATE CREDENTIALS</button>
        <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Forgot your current password? <Link to="/forgot-password" style={{ color: 'var(--cyan)' }}>Reset it via email →</Link>
        </div>
      </form>
    </div>
  );
}

export default function Account() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('ADDRESSES');
  if (loading) return <div className="loading">LOADING…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;

  return (
    <div className="container">
      <h1 className="page-title">▶ PLAYER PROFILE · {(user.firstName || 'PLAYER').toUpperCase()}</h1>
      <div className="muted" style={{ marginBottom: 10 }}>
        Looking for your orders? Head to <Link to="/orders" style={{ color: 'var(--lime)' }}>MY ORDERS →</Link>
      </div>
      <div className="steps">
        {TABS.map((t) => <span key={t} className={`s ${tab === t ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab(t)}>{t}</span>)}
      </div>
      <div style={{ marginTop: 18 }}>
        {tab === 'ADDRESSES' && <Addresses />}
        {tab === 'PROFILE' && <Profile />}
      </div>
    </div>
  );
}
