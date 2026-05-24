import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function fmtSize(n) {
  if (n == null) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let x = Number(n);
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i ? 1 : 0)} ${units[i]}`;
}

export default function Downloads() {
  const { user, loading: authLoading } = useAuth();
  const [path, setPath] = useState('');
  const [data, setData] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    api
      .get(`/downloads?path=${encodeURIComponent(path)}`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path, user]);

  if (authLoading) return <div className="loading">LOADING…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/downloads' }} replace />;

  const segments = path.split('/').filter(Boolean);

  const downloadFile = async (item) => {
    setBusy(item.path);
    setError('');
    try {
      const token = localStorage.getItem('rc_token');
      const res = await fetch(`${API_BASE}/downloads/file?path=${encodeURIComponent(item.path)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try {
          msg = (await res.json()).error || msg;
        } catch (e) {
          /* non-json */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">▶ DOWNLOADS</h1>
      <div className="muted">Files for RC81 players. Browse folders and grab what you need.</div>

      {/* breadcrumb */}
      <div className="steps" style={{ marginTop: 18 }}>
        <span className={`s ${path === '' ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setPath('')}>▸ HOME</span>
        {segments.map((seg, i) => {
          const target = segments.slice(0, i + 1).join('/');
          return (
            <span key={target} className={`s ${i === segments.length - 1 ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setPath(target)}>
              {seg}
            </span>
          );
        })}
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="panel-box" style={{ marginTop: 16 }}>
        {loading ? (
          <div className="loading">LOADING FILES…</div>
        ) : data.items.length === 0 ? (
          <div className="empty-state">This folder is empty.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.path} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 8px' }}>
                    {item.type === 'dir' ? (
                      <span style={{ cursor: 'pointer', color: 'var(--cyan)' }} onClick={() => setPath(item.path)}>
                        📁 {item.name}/
                      </span>
                    ) : (
                      <span>🗎 {item.name}</span>
                    )}
                  </td>
                  <td className="muted" style={{ padding: '14px 8px', textAlign: 'right', width: 120 }}>
                    {item.type === 'file' ? fmtSize(item.size) : '—'}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', width: 160 }}>
                    {item.type === 'dir' ? (
                      <button className="chip" onClick={() => setPath(item.path)}>OPEN</button>
                    ) : (
                      <button className="btn btn--lime" style={{ fontSize: 9, padding: '9px 12px' }} disabled={busy === item.path} onClick={() => downloadFile(item)}>
                        {busy === item.path ? '…' : '↓ DOWNLOAD'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
