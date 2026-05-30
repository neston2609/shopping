import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/account');
    } catch (err) {
      setError(err.details ? `${err.message}: ${err.details.map((d) => d.message).join(', ')}` : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="panel-box" style={{ boxShadow: '6px 6px 0 var(--lime)' }}>
        <h1 className="page-title">▶ START NEW GAME</h1>
        <div className="muted">Join the RC81 Guild and unlock -15% on your first quest.</div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>FIRST NAME</label><input value={form.firstName} onChange={set('firstName')} /></div>
          <div className="field"><label>LAST NAME</label><input value={form.lastName} onChange={set('lastName')} /></div>
          <div className="field"><label>EMAIL *</label><input type="email" value={form.email} onChange={set('email')} required /></div>
          <div className="field"><label>USERNAME (optional — 3-30 chars, letters/numbers/_)</label><input value={form.username} onChange={set('username')} /></div>
          <div className="field"><label>PASSWORD * (min 8 chars)</label><input type="password" value={form.password} onChange={set('password')} required /></div>
          <button className="btn btn--lime" style={{ width: '100%', marginTop: 18 }} disabled={busy}>{busy ? 'CREATING…' : '▶ CREATE ACCOUNT'}</button>
        </form>
        <div className="muted" style={{ marginTop: 16 }}>Already a player? <Link to="/login" style={{ color: 'var(--lime)' }}>Continue game →</Link></div>
      </div>
    </div>
  );
}
