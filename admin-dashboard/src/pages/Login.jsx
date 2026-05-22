import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <h1>RC81 ADMIN</h1>
        <div className="muted">Operator login required.</div>
        {error && <div className="error-msg">{error}</div>}
        <div className="field"><label>EMAIL</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label>PASSWORD</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <button className="btn btn--lime" style={{ width: '100%' }} disabled={busy}>{busy ? 'AUTHENTICATING…' : '▶ SIGN IN'}</button>
        <div className="muted" style={{ marginTop: 14, fontSize: 15 }}>Default: admin@retroconsole1981.gg / Admin1981!</div>
      </form>
    </div>
  );
}
