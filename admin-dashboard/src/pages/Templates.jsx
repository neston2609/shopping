import { useEffect, useState } from 'react';
import { api } from '../api';

function Editor({ tpl, vars, onClose, onSaved }) {
  const [form, setForm] = useState({ name: tpl.name, subject: tpl.subject, body: tpl.body, enabled: tpl.enabled });
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  const save = async () => {
    await api.put(`/admin/templates/${tpl.key}`, form);
    setMsg('Saved.');
    onSaved();
  };
  const doPreview = async () => {
    const r = await api.post(`/admin/templates/${tpl.key}/preview`, {});
    setPreview(r);
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 860 }}>
        <h2>{tpl.key}</h2>
        {msg && <div className="success-msg">{msg}</div>}
        <div className="note">Variables: {vars.join('  ')}</div>
        <label className="toggle" style={{ marginBottom: 12 }}><input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> Enabled</label>
        <div className="field"><label>NAME</label><input value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>SUBJECT</label><input value={form.subject} onChange={set('subject')} /></div>
        <div className="field"><label>BODY (HTML)</label><textarea value={form.body} onChange={set('body')} style={{ minHeight: 220 }} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--lime" onClick={save}>SAVE</button>
          <button className="btn btn--cyan" onClick={doPreview}>PREVIEW</button>
          <button className="btn btn--ghost" onClick={onClose}>CLOSE</button>
        </div>
        {preview && (
          <div style={{ marginTop: 16 }}>
            <div className="muted">Subject: {preview.subject}</div>
            <iframe title="preview" style={{ width: '100%', height: 300, marginTop: 8, border: '3px solid #fff', background: '#fff' }} srcDoc={preview.html} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [vars, setVars] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get('/admin/templates').then((d) => { setTemplates(d.templates || []); setVars(d.supportedVariables || []); });
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="toprow"><div className="h1">EMAIL TEMPLATES</div></div>
      <div className="card">
        <table>
          <thead><tr><th>Key</th><th>Name</th><th>Subject</th><th>Enabled</th><th></th></tr></thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.key}>
                <td className="px" style={{ fontSize: 9 }}>{t.key}</td>
                <td>{t.name}</td>
                <td className="muted">{t.subject}</td>
                <td><span className={`badge ${t.enabled ? 'active' : 'inactive'}`}>{t.enabled ? 'ON' : 'OFF'}</span></td>
                <td><button className="btn btn--cyan btn--sm" onClick={() => setEditing(t)}>EDIT</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <Editor tpl={editing} vars={vars} onClose={() => setEditing(null)} onSaved={load} />}
    </>
  );
}
