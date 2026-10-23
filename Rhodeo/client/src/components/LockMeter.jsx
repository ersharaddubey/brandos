// Lock % meter + live calculator.
// computeLive() server ke lockSchema.js jaisa hi hisaab karta hai (weights + empty-regex server se aate hain),
// isse textarea edit karte waqt % live update hota hai.

export function computeLive(schema, type, profile = {}, anchors = [], rules = []) {
  if (!schema?.types?.[type]) return null;
  const empty = new RegExp(schema.emptyPattern, 'i');
  const filled = (v) => { const s = String(v ?? '').trim(); return s.length > 0 && !empty.test(s); };
  const fg = schema.types[type].map((g) => {
    const missing = g.fields.filter((f) => !filled(profile[f.key])).map((f) => f.key);
    const n = g.fields.length - missing.length;
    return { ...g, kind: 'fields', filled: n, total: g.fields.length, percent: Math.round((n / g.fields.length) * 100), missing };
  });
  const cnt = (key, label, weight, n, target) => ({
    key, label, scope: 'identity', kind: 'count', weight, count: n, filled: Math.min(n, target), total: target,
    percent: Math.round((Math.min(n, target) / target) * 100), missing: [],
  });
  const groups = [
    ...fg.filter((g) => g.scope === 'identity'),
    cnt('anchors', 'Identity anchors', 3, anchors.filter((x) => x.trim()).length, schema.targets.anchors),
    cnt('rules', 'Must-preserve rules', 2, rules.filter((x) => x.trim()).length, schema.targets.rules),
    ...fg.filter((g) => g.scope === 'scene'),
  ];
  const wavg = (arr) => {
    const w = arr.reduce((a, g) => a + g.weight, 0);
    return w ? Math.round(arr.reduce((a, g) => a + g.weight * g.percent, 0) / w) : 0;
  };
  return {
    percent: wavg(groups),
    identityPercent: wavg(groups.filter((g) => g.scope === 'identity')),
    scenePercent: wavg(groups.filter((g) => g.scope === 'scene')),
    fieldsFilled: fg.reduce((a, g) => a + g.filled, 0),
    fieldsTotal: fg.reduce((a, g) => a + g.total, 0),
    groups,
  };
}

const tone = (p) => (p >= 80 ? 'good' : p >= 50 ? 'warn' : 'bad');

export function Bar({ percent, small }) {
  return (
    <div className={'meter ' + tone(percent) + (small ? ' small' : '')}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

/** compact = list card, full = detail page header */
export default function LockMeter({ stats, locked, compact }) {
  if (!stats) return null;
  const p = stats.percent;
  if (compact) {
    return (
      <div style={{ marginTop: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small"><b>{p}%</b> {locked ? 'locked' : 'captured'}</span>
          <span className="muted small">{stats.fieldsFilled}/{stats.fieldsTotal} details</span>
        </div>
        <Bar percent={p} small />
      </div>
    );
  }
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="muted small">{locked ? 'Locked' : 'Lock coverage (lock karne par itna % lock hoga)'}</div>
          <div className={'bigpct ' + tone(p)}>{p}%</div>
        </div>
        <div className="muted small" style={{ textAlign: 'right' }}>
          <div>Identity (prompts me enforce): <b>{stats.identityPercent}%</b></div>
          <div>Scene (reference context): <b>{stats.scenePercent}%</b></div>
          <div>{stats.fieldsFilled}/{stats.fieldsTotal} image details filled</div>
        </div>
      </div>
      <Bar percent={p} />
    </div>
  );
}
