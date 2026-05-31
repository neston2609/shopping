import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="panel-box">
          <h1 className="page-title">▶ RESET PASSWORD</h1>
          <div className="error-msg">Missing reset token. Open the link from your email, or <Link to="/forgot-password" style={{ color: 'var(--lime)' }}>request a new one →</Link></div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await api.post('/auth/reset-password', { token, newPassword: pw }, { auth: false });
      if (r.token) {
        setToken(r.token);
        await refresh();
      }
      setDone(true);
      setTimeout(() => navigate('/account'), 1500);
    } catch (err) {
      setError(err.message || 'Could not reset password. The link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="panel-box">
        <h1 className="page-title">▶ RESET PASSWORD</h1>
        {done ? (
          <div className="success-msg">Password updated. Signing you in…</div>
        ) : (
          <>
            <div className="muted">Pick a new password to continue.</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={submit}>
              <div className="field">
                <label>NEW PASSWORD (min 8 chars)</label>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" autoFocus minLength={8} />
              </div>
              <div className="field">
                <label>CONFIRM NEW PASSWORD</label>
                <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" minLength={8} />
              </div>
              <button className="btn btn--lime" style={{ width: '100%', marginTop: 18 }} disabled={busy}>
                {busy ? 'UPDATING…' : '▶ SET NEW PASSWORD'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
