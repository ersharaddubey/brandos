import { useEffect, useState, createContext, useContext, useCallback } from 'react';

export const TIPS = {
  'pos.saved': {
    title: 'Saved prompts',
    body: 'Your templates appear here. Click to open, edit, and compare versions.',
    why: '“Prompts are reusable creative assets — do not rewrite from scratch every campaign.”',
  },
  'pos.new': {
    title: 'New prompt',
    body: 'Create a template. Variables like {{identity}}, {{scene}}, {{goal}} are filled in Studio later.',
    why: '“Lock the structure once — keep quality consistent across campaigns.”',
  },
  'pos.edit': {
    title: 'Edit = new version',
    body: 'Saving does not delete the old version. It creates a new one so you can compare history.',
    why: '“Go back anytime to the wording that worked better.”',
  },
  'pos.history': {
    title: 'History & comparison',
    body: 'Click a version to make it current. Below you can compare two versions side by side.',
    why: '“A/B test prompts the same way you A/B test creatives.”',
  },
  'pos.empty': {
    title: 'Select a prompt first',
    body: 'Pick a saved prompt from the left, or create one under New prompt. Use Fill dummy data for examples.',
    why: '“Empty state should guide the first step, not confuse.”',
  },
  'studio.ids': {
    title: 'Locked identities',
    body: 'Only LOCKED identities appear here. Select them so the generator receives their reference images.',
    why: '“Without identity lock there is no consistency guarantee.”',
  },
  'studio.brief': {
    title: 'Campaign brief',
    body: 'Goal, scene, composition, and style go into the final prompt. A Prompt OS template is optional.',
    why: '“Same product, different campaign — change only the brief.”',
  },
  'studio.actions': {
    title: 'Get prompt vs Generate',
    body: 'Get prompt = JSON + English paragraph to paste anywhere. Generate here = create the image on this server (mock/Flux).',
    why: '“Prompt copy is free; generation is optional.”',
  },
  'ic.fromimg': {
    title: 'Image → Prompt',
    body: 'Upload any photo. Analysis builds a structured prompt you can edit, then generate from.',
    why: '“Reverse-engineer a prompt from a reference and save time.”',
  },
  'ic.freeform': {
    title: 'Freeform Prompt → Image',
    body: 'Write or paste a full prompt and generate without locking an identity first.',
    why: '“Quick tests without the full identity workflow.”',
  },
  'ic.fields': {
    title: 'Structured fields',
    body: 'Subject, lighting, face, anchors… Leave blank to ignore. Filled fields merge into the final prompt.',
    why: '“Structure keeps outputs controllable.”',
  },
  'id.create': {
    title: 'New identity',
    body: 'Upload a reference. Analysis extracts a profile (product / character / environment / brand). Review, then Lock.',
    why: '“After lock, the profile is versioned so it cannot change by accident.”',
  },
  'check.ids': {
    title: 'Identity select',
    body: 'Choose which locked identities to score against. Their anchors drive the match.',
    why: '“Consistency check = generated image vs locked reference.”',
  },
  'check.upload': {
    title: 'Image + scene',
    body: 'Upload an image made elsewhere (or here). Scene empty means use the reference scene.',
    why: '“Verify external generators against your identity here.”',
  },
  'dash.flow': {
    title: 'Recommended flow',
    body: 'Order: Identity Lock → Prompt OS → Studio → Check & Analysis → Asset Bank / Open Shelf.',
    why: '“Create once. Lock identity. Reuse everywhere.”',
  },
};

const TourCtx = createContext(null);

export function TourProvider({ steps = [], children, autoStart = false }) {
  const [i, setI] = useState(-1);
  const [openTip, setOpenTip] = useState(null);

  const start = useCallback(() => {
    if (!steps.length) return;
    setI(0);
  }, [steps.length]);
  const stop = useCallback(() => {
    setI(-1);
    try {
      localStorage.setItem('ci_tour_seen', '1');
    } catch {}
  }, []);
  const next = useCallback(() => {
    setI((x) => {
      if (x < steps.length - 1) return x + 1;
      try {
        localStorage.setItem('ci_tour_seen', '1');
      } catch {}
      return -1;
    });
  }, [steps.length]);
  const prev = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  useEffect(() => {
    if (!autoStart || !steps.length) return;
    let seen = false;
    try {
      seen = localStorage.getItem('ci_tour_seen') === '1';
    } catch {}
    if (!seen) {
      const t = setTimeout(() => setI(0), 600);
      return () => clearTimeout(t);
    }
  }, [autoStart, steps.length]);

  return (
    <TourCtx.Provider value={{ i, steps, start, stop, next, prev, openTip, setOpenTip }}>
      {children}
      {i >= 0 && steps[i] && (
        <TourOverlay step={steps[i]} index={i} total={steps.length} onNext={next} onPrev={prev} onClose={stop} />
      )}
      {openTip && TIPS[openTip] && <TipModal tipKey={openTip} onClose={() => setOpenTip(null)} />}
    </TourCtx.Provider>
  );
}

export function useTour() {
  return useContext(TourCtx) || { start: () => {}, stop: () => {}, openTip: null, setOpenTip: () => {} };
}

export function Tip({ id, className = '' }) {
  const { setOpenTip } = useTour();
  if (!TIPS[id]) return null;
  return (
    <button
      type="button"
      className={`tip-btn ${className}`}
      title={TIPS[id].title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenTip(id);
      }}
      aria-label={`Help: ${TIPS[id].title}`}
    >
      ?
    </button>
  );
}

/** Dummy data only — no tour button (tour lives only on Dashboard) */
export function GuideBar({ onDummy, dummyLabel = 'Fill dummy data', showTour = false, tourLabel = 'Start tour' }) {
  const { start } = useTour();
  if (!onDummy && !showTour) return null;
  return (
    <div className="guide-bar">
      {showTour && (
        <button type="button" className="ghost" onClick={start}>
          {tourLabel}
        </button>
      )}
      {onDummy && (
        <button type="button" className="ghost dummy-btn" onClick={onDummy}>
          {dummyLabel}
        </button>
      )}
    </div>
  );
}

function TipModal({ tipKey, onClose }) {
  const t = TIPS[tipKey];
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="tour-backdrop" onClick={onClose}>
      <div className="tip-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{t.title}</h3>
          <button type="button" className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <p style={{ margin: '0 0 12px' }}>{t.body}</p>
        {t.why && <blockquote className="why">{t.why}</blockquote>}
      </div>
    </div>
  );
}

/** Fixed bottom panel — never clipped by the viewport */
function TourOverlay({ step, index, total, onNext, onPrev, onClose }) {
  useEffect(() => {
    const el = step.selector ? document.querySelector(step.selector) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="tour-layer">
      <div className="tour-dim" onClick={onClose} />
      <div className="tour-card tour-card-fixed">
        <div className="muted small">
          Step {index + 1} / {total}
        </div>
        <h3 style={{ margin: '6px 0 10px' }}>{step.title}</h3>
        <p style={{ margin: '0 0 12px', lineHeight: 1.55 }}>{step.body}</p>
        {step.why && <blockquote className="why">{step.why}</blockquote>}
        <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
          <button type="button" className="ghost" onClick={onClose}>
            Skip tour
          </button>
          <div className="row">
            {index > 0 && (
              <button type="button" className="ghost" onClick={onPrev}>
                Back
              </button>
            )}
            <button type="button" onClick={onNext}>
              {index === total - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyHint({ title, body, why, children }) {
  return (
    <div className="card empty-hint">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted">{body}</p>
      {why && <blockquote className="why">{why}</blockquote>}
      {children}
    </div>
  );
}
