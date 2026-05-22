import { useEffect, useState } from 'react';
import { api } from '../api';

const FILTERS = ['', 'sent', 'failed', 'queued'];

export default function EmailLogs() {
  const [data, setData] = useState({ logs: [] });
  const [status, setStatus] = useState('');
  const load = () => api.get(`/admin/email-logs?limit=100${status ? `&status=${status}` : ''}`).then(setData);
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  return (
    <>
      <div className="toprow"><div className="h1">EMAIL LOGS</div></div>
      <div className="toolbar">
        {FILTERS.map((f) => <span key={f || 'all'} className={`chip ${status === f ? 'on' : ''}`} onClick={() => setStatus(f)}>{f || 'ALL'}</span>)}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>To</th><th>Subject</th><th>Template</th><th>Status</th><th>When</th><th>Error</th></tr></thead>
          <tbody>
            {data.logs.map((l) => (
              <tr key={l.id}>
                <td className="muted">{l.recipient}</td>
                <td>{l.subject}</td>
                <td className="muted">{l.templateKey || '—'}</td>
                <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                <td className="muted">{new Date(l.sentAt || l.createdAt).toLocaleString()}</td>
                <td className="muted" style={{ color: l.errorMessage ? 'var(--magenta)' : undefined }}>{l.errorMessage || ''}</td>
              </tr>
            ))}
            {!data.logs.length && <tr><td colSpan={6} className="muted">No email logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
