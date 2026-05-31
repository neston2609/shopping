import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() }, { auth: false });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="panel-box">
        <h1 className="page-title">▶ FORGOT PASSWORD</h1>
        {done ? (
          <>
            <div className="success-msg">
              If <b>{email}</b> is on file, we've sent a reset link to that address. The link expires in 1 hour.
            </div>
            <div className="muted" style={{ marginTop: 14 }}>
              Didn't get it? Check your spam folder, or <button className="chip" onClick={() => setDone(false)}>try again</button>.
            </div>
            <div style={{ marginTop: 18 }}>
              <Link className="btn btn--ghost" to="/login">◀ BACK TO SIGN IN</Link>
            </div>
          </>
        ) : (
          <>
            <div className="muted">Enter the email on your account and we'll send a password-reset link.</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={submit}>
              <div className="field">
                <label>EMAIL</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
              </div>
              <button className="btn btn--lime" style={{ width: '100%', marginTop: 18 }} disabled={busy}>
                {busy ? 'SENDING…' : '▶ SEND RESET LINK'}
              </button>
            </form>
            <div className="muted" style={{ marginTop: 16 }}>
              Remembered it? <Link to="/login" style={{ color: 'var(--lime)' }}>Sign in →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
