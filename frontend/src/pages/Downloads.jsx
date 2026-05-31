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

// ----- Folder thumbnail: explicitly computes width from the loaded image's
// natural aspect ratio, so width is guaranteed to scale with admin-configured height.
function FolderThumb({ src, height }) {
  const [errored, setErrored] = useState(false);
  if (errored) return <span style={{ fontSize: 22 }}>📁</span>;
  return (
    <img
      src={src}
      alt=""
      onError={() => setErrored(true)}
      style={{
        maxHeight: height,
        height: 'auto',
        width: 'auto',
        maxWidth: 'none',
        flexShrink: 0,
        display: 'block',
        border: '2px solid var(--line)',
      }}
    />
  );
}

// ----- Countdown gate modal -----
function AffCountdown({ item, seconds, slug, onClose }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const triggerDownload = () => {
    const token = localStorage.getItem('rc_token') || '';
    const url = `${API_BASE}/downloads/${slug}/file?path=${encodeURIComponent(item.path)}&token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url; a.download = item.name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    onClose();
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
      <div className="panel-box" style={{ maxWidth: 460, textAlign: 'center', boxShadow: '6px 6px 0 var(--magenta)' }}>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 12, color: 'var(--gold)' }}>// PREPARING DOWNLOAD</div>
        <div className="muted" style={{ marginTop: 12 }}>{item.name}</div>
        <div style={{ marginTop: 22, fontFamily: 'Press Start 2P', fontSize: 36, color: 'var(--lime)' }}>{Math.max(0, left)}</div>
        <div className="muted" style={{ marginTop: 8 }}>{left > 0 ? 'Please support us by visiting the page that opened in the other tab.' : 'Ready! Click below to start the download.'}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <button className="btn btn--lime" onClick={triggerDownload} disabled={left > 0}>{left > 0 ? `WAIT ${left}s` : '↓ DOWNLOAD NOW'}</button>
          <button className="btn btn--ghost" onClick={onClose}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ----- Pager (numbered + prev/next, with collapsed middle when many pages) -----
function Pager({ page, pageCount, total, pageSize, onChange }) {
  const go = (p) => {
    if (p < 1 || p > pageCount || p === page) return;
    onChange(p);
    // Scroll back to the top of the list for context.
    try { window.scrollTo({ top: 200, behavior: 'smooth' }); } catch (e) { /* */ }
  };
  // Build a compact page-button list: always first + last, plus a window around the current page.
  const buttons = [];
  const push = (p) => buttons.push(p);
  const inWindow = (p) => Math.abs(p - page) <= 1;
  for (let p = 1; p <= pageCount; p += 1) {
    if (p === 1 || p === pageCount || inWindow(p)) push(p);
    else if (buttons[buttons.length - 1] !== '…') push('…');
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
      <div className="muted" style={{ fontSize: 13 }}>
        Showing <b style={{ color: '#fff' }}>{start}–{end}</b> of <b style={{ color: 'var(--lime)' }}>{total}</b>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="chip" onClick={() => go(page - 1)} disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }}>◀ PREV</button>
        {buttons.map((p, i) => p === '…' ? (
          <span key={`gap-${i}`} className="muted" style={{ padding: '0 6px' }}>…</span>
        ) : (
          <button
            key={p}
            className="chip"
            onClick={() => go(p)}
            style={p === page ? { background: 'var(--lime)', color: '#0d0420', borderColor: 'var(--lime)', fontWeight: 'bold' } : undefined}
          >{p}</button>
        ))}
        <button className="chip" onClick={() => go(page + 1)} disabled={page >= pageCount} style={{ opacity: page >= pageCount ? 0.4 : 1 }}>NEXT ▶</button>
      </div>
    </div>
  );
}

// ----- Category browser (/downloads/:slug) -----
function CategoryBrowser({ slug }) {
  const [path, setPath] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // file waiting on aff countdown
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    setPage(1); // reset to first page whenever path changes
    api
      .get(`/downloads/${slug}?path=${encodeURIComponent(path)}`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, path]);

  // Direct-link streaming download. If an affiliate gate is configured, open
  // the aff URL in a new tab and show a countdown — the download fires only
  // when the timer reaches 0.
  const downloadFile = (item) => {
    setError('');
    const aff = data?.aff;
    if (aff?.url && Number(aff.delaySeconds) > 0) {
      window.open(aff.url, '_blank', 'noopener,noreferrer');
      setPending({ item, seconds: Number(aff.delaySeconds) });
      return;
    }
    const token = localStorage.getItem('rc_token') || '';
    const url = `${API_BASE}/downloads/${slug}/file?path=${encodeURIComponent(item.path)}&token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url; a.download = item.name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
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
        ) : (() => {
          const pageSize = Math.max(5, Number(data.display?.pageSize) || 50);
          const total = data.items.length;
          const pageCount = Math.max(1, Math.ceil(total / pageSize));
          const curPage = Math.min(page, pageCount);
          const start = (curPage - 1) * pageSize;
          const visible = data.items.slice(start, start + pageSize);
          return (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {visible.map((item) => {
                    const token = localStorage.getItem('rc_token') || '';
                    const thumbUrl = item.thumb
                      ? `${API_BASE}/downloads/${slug}/thumb?path=${encodeURIComponent(item.thumb)}&token=${encodeURIComponent(token)}`
                      : null;
                    return (
                    <tr key={item.path} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 8px' }}>
                        {item.type === 'dir' ? (
                          <span style={{ cursor: 'pointer', color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: 10 }} onClick={() => setPath(item.path)}>
                            {thumbUrl ? (
                              <FolderThumb src={thumbUrl} height={data.display?.folderThumbHeight || 48} />
                            ) : (
                              <span style={{ fontSize: 22 }}>📁</span>
                            )}
                            <span>{item.name}/</span>
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
                          <button className="btn btn--lime" style={{ fontSize: 9, padding: '9px 12px' }} onClick={() => downloadFile(item)}>↓ DOWNLOAD</button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {pageCount > 1 && (
                <Pager page={curPage} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
              )}
            </>
          );
        })()}
      </div>

      {pending && (
        <AffCountdown item={pending.item} seconds={pending.seconds} slug={slug} onClose={() => setPending(null)} />
      )}
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
