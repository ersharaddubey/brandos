import { useState } from 'react';

export function Copy({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false);
  const click = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setOk(true); setTimeout(() => setOk(false), 1200);
  };
  return <button type="button" className="ghost" onClick={click}>{ok ? 'Copied ✓' : label}</button>;
}

/**
 * Compiled prompt dikhata hai:  1) JSON   2) Natural English paragraph (JSON ke niche)   3) baaki sites ke format.
 * `result` = POST /api/compile ka response.
 */
export default function PromptView({ result, title = 'Prompt' }) {
  if (!result) return null;
  const json = JSON.stringify(result.json, null, 2);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{title}</h2>
        <span className="muted small">{result.stats.words} words · same model + same seed use karo</span>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <label style={{ margin: 0 }}>1. JSON (structured spec)</label>
        <Copy text={json} label="Copy JSON" />
      </div>
      <pre className="scroll">{json}</pre>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <label style={{ margin: 0 }}>2. Natural English paragraph (Gemini / GPT-image / Ideogram / Copilot)</label>
        <span className="row">
          <Copy text={result.blocks.identity} label="Identity block" />
          <Copy text={result.blocks.scene} label="Scene block" />
          <Copy text={result.paragraph} label="Copy paragraph" />
        </span>
      </div>
      <p className="prose">{result.paragraph}</p>

      <details>
        <summary>Flux / SDXL / Leonardo (tags + negative prompt)</summary>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}><label style={{ margin: 0 }}>Prompt</label><Copy text={result.flux.prompt} /></div>
        <pre>{result.flux.prompt}</pre>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}><label style={{ margin: 0 }}>Negative prompt</label><Copy text={result.flux.negative} /></div>
        <pre>{result.flux.negative}</pre>
      </details>
      <details>
        <summary>Midjourney</summary>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}><Copy text={result.midjourney} /></div>
        <pre>{result.midjourney}</pre>
      </details>
      {result.notes?.length > 0 && <ul className="plain small">{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
    </div>
  );
}
