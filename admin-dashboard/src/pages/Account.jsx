import { useState } from 'react';
import { useAuth } from '../auth';

export default function Account() {
  const { user, updateCredentials } = useAuth();
  const [cred, setCred] = useState({ currentPassword: '', newEmail: '', newUsername: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setCred((c) => ({ ...c, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = { currentPassword: cred.currentPassword };
      if (cred.newEmail) payload.newEmail = cred.newEmail.trim();
      if (cred.newUsername !== '') payload.newUsername = cred.newUsername.trim();
      if (cred.newPassword) payload.newPassword = cred.newPassword;
      await updateCredentials(payload);
      setCred({ currentPassword: '', newEmail: '', newUsername: '', newPassword: '' });
      setMsg({ ok: true, text: 'Credentials updated. New email/username take effect at your next sign-in.' });
    } catch (err) {
      setMsg({ ok: false, text: err.details ? err.details.map((d) => d.message).join('; ') : err.message });
    }
  };

  if (!user) return null;
  return (
    <>
      <div className="toprow"><div className="h1">MY ACCOUNT</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>Change the email, username, or password on your admin account.</div>

      <div className="card" style={{ maxWidth: 640, marginBottom: 16 }}>
        <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>CURRENT</div>
        <div className="grid2">
          <div className="field"><label>EMAIL</label><input value={user.email} disabled /></div>
          <div className="field"><label>USERNAME</label><input value={user.username || '—'} disabled /></div>
        </div>
      </div>

      <form className="card" onSubmit={save} style={{ maxWidth: 640, boxShadow: '5px 5px 0 var(--magenta)' }}>
        <div className="px" style={{ fontSize: 11, color: 'var(--magenta)', marginBottom: 12 }}>CHANGE CREDENTIALS</div>
        <div className="muted" style={{ marginBottom: 8 }}>Enter your current password, then fill in only the fields you want to change.</div>
        {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}
        <div className="field"><label>CURRENT PASSWORD *</label><input type="password" value={cred.currentPassword} onChange={set('currentPassword')} required autoComplete="current-password" /></div>
        <div className="field"><label>NEW EMAIL</label><input type="email" value={cred.newEmail} onChange={set('newEmail')} placeholder={user.email} /></div>
        <div className="field"><label>NEW USERNAME (3-30 chars; clear to remove)</label><input value={cred.newUsername} onChange={set('newUsername')} placeholder={user.username || ''} /></div>
        <div className="field"><label>NEW PASSWORD (min 8 chars)</label><input type="password" value={cred.newPassword} onChange={set('newPassword')} autoComplete="new-password" /></div>
        <button className="btn btn--lime" style={{ marginTop: 8 }}>UPDATE</button>
      </form>
    </>
  );
}
