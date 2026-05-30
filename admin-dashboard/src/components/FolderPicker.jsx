import { useEffect, useState } from 'react';
import { api } from '../api';

// Modal that browses a download source. Click folders to navigate in;
// click "Select this folder" to send the current path back to the parent.
// For SFTP/FTP/FTPS sources, "path" is the absolute filesystem path.
// For OneDrive / Google Drive sources, "path" is the opaque folder id ("root" = drive root).
export default function FolderPicker({ open, sourceId, initialPath, onSelect, onClose }) {
  const [path, setPath] = useState(initialPath || '');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!sourceId) { setError('Pick a source first.'); setData(null); return; }
    setBusy(true);
    setError('');
    api
      .get(`/admin/sources/${sourceId}/browse?path=${encodeURIComponent(path)}`)
      .then((r) => {
        if (r.ok === false) {
          setError(r.message || 'Browse failed');
          setData(null);
        } else {
          setData(r);
          setPath(r.path);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [open, sourceId, path]);

  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 720 }}>
        <h2>BROWSE FOLDER</h2>
        <div className="muted" style={{ marginBottom: 8 }}>
          Click a folder to open it. Click <b>Select this folder</b> when you're in the path you want.
        </div>

        <div className="field">
          <label>CURRENT PATH</label>
          <input value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setPath(e.target.value)} />
        </div>

        {error && <div className="error-msg">{error}</div>}
        {busy && <div className="muted">Listing…</div>}

        {data && (
          <div className="card" style={{ padding: 12, maxHeight: 320, overflow: 'auto' }}>
            {data.parent && data.parent !== data.path && (
              <div style={{ padding: '6px 0', cursor: 'pointer', color: 'var(--cyan)' }} onClick={() => setPath(data.parent)}>↰ ..</div>
            )}
            {data.entries.length === 0 && <div className="muted">(empty)</div>}
            {data.entries.map((e) => (
              <div key={e.path} style={{ padding: '6px 0', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
                {e.type === 'dir' ? (
                  <span style={{ cursor: 'pointer', color: 'var(--cyan)' }} onClick={() => setPath(e.path)}>📁 {e.name}/</span>
                ) : (
                  <span className="muted">🗎 {e.name}</span>
                )}
                {e.type === 'file' && e.size != null && <span className="muted">{e.size} B</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn--lime" onClick={() => { onSelect(path); onClose(); }} disabled={!data || !!error}>SELECT THIS FOLDER</button>
          <button className="btn btn--ghost" onClick={onClose}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
