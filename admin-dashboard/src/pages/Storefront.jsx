import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Storefront() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = () => api.get('/admin/store-settings').then((d) => setForm(d.settings));
  useEffect(() => { load(); }, []);
  if (!form) return <div className="px">LOADING…</div>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.put('/admin/store-settings', {
        heroHeading: form.heroHeading || '',
        heroSubheading: form.heroSubheading || '',
      });
      setMsg({ ok: true, text: 'Storefront settings saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <>
      <div className="toprow"><div className="h1">STOREFRONT</div></div>
      <div className="muted" style={{ marginBottom: 16 }}>
        Edit the homepage hero text. <b>HTML is allowed</b> — use <code>&lt;br/&gt;</code> for line breaks and <code>&lt;span class="cyan"&gt;…&lt;/span&gt;</code> or <code>&lt;span class="gold"&gt;…&lt;/span&gt;</code> for the accent colors. Leave a field blank to use the built-in default.
      </div>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}

      <form className="card" onSubmit={save} style={{ maxWidth: 800 }}>
        <div className="field">
          <label>HERO HEADING (HTML)</label>
          <textarea
            value={form.heroHeading || ''}
            onChange={set('heroHeading')}
            placeholder={`COLLECT THE<br/><span class="cyan">CONSOLES</span> THAT<br/>BUILT YOUR<br/><span class="gold">CHILDHOOD</span>.`}
            style={{ minHeight: 120 }}
          />
        </div>
        <div className="field">
          <label>HERO SUBHEADING (HTML)</label>
          <textarea
            value={form.heroSubheading || ''}
            onChange={set('heroSubheading')}
            placeholder="Hand-restored handhelds. Sealed cartridges. CRT-ready cables…"
            style={{ minHeight: 100 }}
          />
        </div>
        <button className="btn btn--lime">SAVE</button>
      </form>

      <div className="card" style={{ marginTop: 16, maxWidth: 800 }}>
        <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 10 }}>PREVIEW (HEADING)</div>
        <div
          style={{ fontFamily: 'Press Start 2P, monospace', fontSize: 24, lineHeight: 1.4, color: '#fff' }}
          dangerouslySetInnerHTML={{
            __html:
              form.heroHeading ||
              'COLLECT THE<br/><span style="color:#3dd4f0">CONSOLES</span> THAT<br/>BUILT YOUR<br/><span style="color:#ffc845">CHILDHOOD</span>.',
          }}
        />
        <div
          className="muted"
          style={{ marginTop: 14 }}
          dangerouslySetInnerHTML={{ __html: form.heroSubheading || 'Hand-restored handhelds. Sealed cartridges…' }}
        />
      </div>
    </>
  );
}
