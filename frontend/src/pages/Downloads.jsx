import { useEffect, useState } from 'react';
import { Navigate, Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function fmtSize(n) {
  if (n == null) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let x = Number(n);
  let i = 0;
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i ? 1 : 0)} ${u[i]}`;
}

// ----- Category grid (root of /downloads) -----
function CategoryGrid() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/downloads').then((d) => setCats(d.categories || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">▶ DOWNLOADS</h1>
      <div className="muted">Pick a category to browse files.</div>
      {error && <div className="error-msg">{error}</div>}
      {loading ? (
        <div className="loading">LOADING…</div>
      ) : cats.length === 0 ? (
        <div className="empty-state">No download categories available yet.</div>
      ) : (
        <div className="cats" style={{ marginTop: 24 }}>
          {cats.map((c) => (
            <Link className="cat" key={c.id} to={`/downloads/${c.slug}`}>
              <div className="top" style={c.imageUrl ? { background: `url(${c.imageUrl}) center/cover` } : undefined}>
                {!c.imageUrl && (
                  <div className="glyph">
                    <div className="glyphlbl">{(c.name.split(' ')[0] || 'FILES').slice(0, 6).toUpperCase()}</div>
                  </div>
                )}
              </div>
              <div className="body">
                <div className="name">{c.name.toUpperCase()}</div>
                <div className="meta">
                  <span>{c.description || 'files'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Category browser (/downloads/:slug) -----
function CategoryBrowser({ slug }) {
  const [path, setPath] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/downloads/${slug}?path=${encodeURIComponent(path)}`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, path]);

  // Direct-link download: streams straight from the server to the browser's
  // save dialog (no in-memory blob), so large files don't hang or OOM.
  const downloadFile = (item) => {
    setError('');
    const token = localStorage.getItem('rc_token') || '';
    const url = `${API_BASE}/downloads/${slug}/file?path=${encodeURIComponent(item.path)}&token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const segments = path.split('/').filter(Boolean);

  return (
    <div className="container">
      <h1 className="page-title">▶ DOWNLOADS {data?.category ? `// ${data.category.name.toUpperCase()}` : ''}</h1>
      <div className="muted">{data?.category?.description}</div>

      <div className="steps" style={{ marginTop: 18 }}>
        <Link className="s" to="/downloads">▸ ALL CATEGORIES</Link>
        <span className={`s ${path === '' ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setPath('')}>{data?.category?.name?.toUpperCase() || 'ROOT'}</span>
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
        ) : !data || data.items.length === 0 ? (
          <div className="empty-state">This folder is empty.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.path} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 8px' }}>
                    {item.type === 'dir' ? (
                      <span style={{ cursor: 'pointer', color: 'var(--cyan)' }} onClick={() => setPath(item.path)}>📁 {item.name}/</span>
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

export default function Downloads() {
  const { user, loading: authLoading } = useAuth();
  const { slug } = useParams();
  if (authLoading) return <div className="loading">LOADING…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/downloads' }} replace />;
  return slug ? <CategoryBrowser slug={slug} /> : <CategoryGrid />;
}
