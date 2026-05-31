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
        lineChatEmbed: (form.lineChatEmbed || '').trim(),
        lineBasicId: (form.lineBasicId || '').trim(),
      });
      setMsg({ ok: true, text: 'Storefront settings saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.details ? err.details.map((d) => d.message).join('; ') : err.message });
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

        <div className="px" style={{ fontSize: 11, color: 'var(--gold)', marginTop: 18, marginBottom: 6 }}>// LINE OA CHAT BUBBLE</div>
        <div className="muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>
          A floating LINE button on every storefront page. <b>Two ways</b> — pick whichever you can set up. If both are filled, the official embed below wins.
        </div>

        <div className="card" style={{ marginBottom: 12, background: '#0b0220' }}>
          <div className="px" style={{ fontSize: 10, color: 'var(--cyan)', marginBottom: 8 }}>OPTION 1 · BASIC ID (works for any OA, no LINE-side setup)</div>
          <div className="muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>
            Find your OA's Basic ID at <a href="https://manager.line.biz/" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>LINE OA Manager</a> → click your OA → look near the OA name (e.g. <code>@retroconsole1981</code>). Paste it here and a LINE-green floating button appears on the storefront — customers tap it to open a chat with your OA, you reply from LINE OA Manager.
          </div>
          <div className="field">
            <label>LINE OA BASIC ID (with or without "@")</label>
            <input
              value={form.lineBasicId || ''}
              onChange={set('lineBasicId')}
              placeholder="@retroconsole1981"
            />
          </div>
        </div>

        <div className="card" style={{ background: '#0b0220' }}>
          <div className="px" style={{ fontSize: 10, color: 'var(--cyan)', marginBottom: 8 }}>OPTION 2 · OFFICIAL CHAT PLUGIN (advanced, uses LINE-hosted widget)</div>
          <div className="muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>
            If LINE OA Manager → <b>Home → Chat plugin</b> (or <b>Settings → Chat plugin</b>) is available for your account: enable it, register your domains (<code>shopping.retroconsole1981.com</code>, <code>www.retroconsole1981.com</code>, <code>retroconsole1981.com</code>), copy the snippet LINE shows you and paste the whole thing below. <b>Can't find that menu?</b> Use Option 1 — it works for every OA.
          </div>
          <div className="field">
            <label>LINE CHAT EMBED SNIPPET (paste the full {`<script>`} + {`<div>`} block from LINE)</label>
            <textarea
              value={form.lineChatEmbed || ''}
              onChange={set('lineChatEmbed')}
              placeholder={'<script src="https://www.line-scdn.net/n/line_chat/loader.js" async defer></script>\n<div data-lcp="<your-plugin-id>"></div>'}
              style={{ minHeight: 100, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        </div>

        <button className="btn btn--lime" style={{ marginTop: 6 }}>SAVE</button>
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
