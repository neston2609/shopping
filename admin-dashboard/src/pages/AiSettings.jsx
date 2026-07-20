import { useEffect, useState } from 'react';
import { api } from '../api';

const BRAND_LABELS = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  custom: 'Custom Endpoint',
};

export default function AiSettings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [models, setModels] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/admin/ai').then((d) => {
      setSettings(d.settings);
      setForm({
        brand: d.settings.brand,
        endpointUrl: d.settings.endpointUrl || '',
        apiKey: '',
        model: d.settings.model || '',
        enabled: d.settings.enabled,
      });
      if (d.settings.model) setModels([d.settings.model]);
    });
  useEffect(() => { load(); }, []);

  if (!form) return <div className="px">LOADING…</div>;

  const isCustom = form.brand === 'custom';
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: k === 'enabled' ? e.target.checked : e.target.value }));

  // Reset the selected model whenever the brand changes.
  const onBrandChange = (e) => {
    const brand = e.target.value;
    setForm((f) => ({ ...f, brand, model: '' }));
    setModels([]);
    setMsg(null);
  };

  const probeBody = () => ({
    brand: form.brand,
    endpointUrl: isCustom ? form.endpointUrl : '',
    ...(form.apiKey ? { apiKey: form.apiKey } : {}),
  });

  const fetchModels = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api.post('/admin/ai/models', probeBody());
      if (r.ok) {
        setModels(r.models);
        if (r.models.length === 0) setMsg({ ok: false, text: 'No models returned for this provider.' });
        else setMsg({ ok: true, text: `Fetched ${r.models.length} model(s).` });
      } else {
        setMsg({ ok: false, text: r.message });
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const testConn = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api.post('/admin/ai/test', probeBody());
      setMsg({ ok: r.ok, text: r.message });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (isCustom && !form.endpointUrl) {
      setMsg({ ok: false, text: 'Endpoint URI is required for a custom AI provider.' });
      return;
    }
    const payload = {
      brand: form.brand,
      endpointUrl: isCustom ? form.endpointUrl : '',
      model: form.model || '',
      enabled: form.enabled,
    };
    if (form.apiKey) payload.apiKey = form.apiKey;
    try {
      await api.put('/admin/ai', payload);
      setMsg({ ok: true, text: 'AI configuration saved.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.details?.[0]?.message || err.message });
    }
  };

  return (
    <>
      <div className="toprow"><div className="h1">AI CONFIGURATION</div></div>
      <div className="note">
        Configure the AI provider used across the store (e.g. product-image analysis). Choose a
        brand, enter your API key, fetch the available models, pick one, then save.
      </div>
      {msg && <div className={msg.ok ? 'success-msg' : 'error-msg'}>{msg.text}</div>}

      <form className="card" onSubmit={save} style={{ maxWidth: 720 }}>
        <label className="toggle" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={form.enabled} onChange={set('enabled')} /> AI FEATURES ENABLED
        </label>

        <div className="grid2">
          <div className="field">
            <label>AI BRAND</label>
            <select value={form.brand} onChange={onBrandChange}>
              {(settings.brands || ['openai', 'gemini', 'claude', 'custom']).map((b) => (
                <option key={b} value={b}>{BRAND_LABELS[b] || b}</option>
              ))}
            </select>
          </div>
          {!isCustom && (
            <div className="field">
              <label>ENDPOINT (DEFAULT)</label>
              <input value={settings.defaultEndpoints?.[form.brand] || ''} disabled readOnly />
            </div>
          )}
          {isCustom && (
            <div className="field">
              <label>ENDPOINT URI *</label>
              <input
                value={form.endpointUrl}
                onChange={set('endpointUrl')}
                placeholder="https://your-endpoint.example.com/v1"
              />
            </div>
          )}
        </div>

        <div className="grid2">
          <div className="field">
            <label>API KEY</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={set('apiKey')}
              placeholder={settings.hasApiKey ? '•••• already set (leave blank to keep)' : 'not set'}
            />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button type="button" className="btn btn--cyan btn--sm" onClick={fetchModels} disabled={busy}>
              {busy ? 'WORKING…' : 'FETCH MODELS'}
            </button>
            <button type="button" className="btn btn--gold btn--sm" onClick={testConn} disabled={busy}>
              TEST
            </button>
          </div>
        </div>

        <div className="field">
          <label>MODEL</label>
          <select value={form.model} onChange={set('model')} disabled={models.length === 0}>
            <option value="">
              {models.length === 0 ? '— fetch models first —' : '— select a model —'}
            </option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <button className="btn btn--lime">SAVE CONFIGURATION</button>
      </form>
    </>
  );
}
