import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      navigate(location.state?.from || '/account');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="panel-box">
        <h1 className="page-title">▶ CONTINUE GAME</h1>
        <div className="muted">Sign in to load your save file.</div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>EMAIL OR USERNAME</label><input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" /></div>
          <div className="field"><label>PASSWORD</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 4 }}>
            <Link to="/forgot-password" style={{ color: 'var(--cyan)', fontSize: 13 }}>Forgot password?</Link>
          </div>
          <button className="btn btn--lime" style={{ width: '100%', marginTop: 18 }} disabled={busy}>{busy ? 'LOADING…' : '▶ SIGN IN'}</button>
        </form>
        <div className="muted" style={{ marginTop: 16 }}>New here? <Link to="/register" style={{ color: 'var(--lime)' }}>Start a new game →</Link></div>
        <div className="muted" style={{ marginTop: 10, fontSize: 16 }}>Demo: player1@retroconsole1981.gg / Player1981!</div>
      </div>
    </div>
  );
}
