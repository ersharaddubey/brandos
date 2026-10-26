const PROBLEMS = [
  {
    icon: '🎯',
    title: 'Identity drift across every campaign',
    body: 'The same product, talent, logo, or set shifts slightly with every generation. Brand recognition erodes, and teams burn budget on reshoots and rework.',
  },
  {
    icon: '📸',
    title: 'Creative cost scales linearly with volume',
    body: 'E-commerce, fashion, CPG, and real estate still treat each season, SKU, and channel as a new production. Traditional shoots and ad-hoc AI prompts do not compound.',
  },
  {
    icon: '🧩',
    title: 'Generators without an identity layer',
    body: 'The market is full of prompt tools and image models. Almost none lock product, character, brand, and environment as durable, reusable assets—so consistency stays accidental.',
  },
  {
    icon: '📉',
    title: 'No score before publish',
    body: 'Teams cannot measure whether a generated asset still matches the approved identity. QA relies on taste; brand risk stays high.',
  },
];

const FEATURES = [
  {
    icon: '🔒',
    title: 'Identity Lock',
    body: 'Upload references for product, character, environment, and brand. Analyze, review the profile, then lock once for reuse across campaigns.',
  },
  {
    icon: '✂️',
    title: 'Four layers from one plate',
    body: 'Split a single campaign image into separate product, character, environment, and brand identity drafts.',
  },
  {
    icon: '🎬',
    title: 'Studio (image & video)',
    body: 'Select any combination of locked identities, attach a campaign brief, compile the prompt, and generate stills or short video.',
  },
  {
    icon: '📊',
    title: 'Check & Analysis',
    body: 'Score outputs against locked anchors before publish. Turn a photo into a structured prompt when needed.',
  },
  {
    icon: '🗂️',
    title: 'Asset Bank & shared shelf',
    body: 'Private campaign storage versus shared public assets, with groups by company and type for team reuse.',
  },
  {
    icon: '🧠',
    title: 'Prompt OS',
    body: 'Versioned templates and structured campaign fields tied to locked identities—not one-off prompt paste.',
  },
  {
    icon: '🔌',
    title: 'Pluggable generators',
    body: 'Swap image and video backends (ComfyUI, cloud APIs, and more). The identity layer stays stable above the model.',
  },
  {
    icon: '🤖',
    title: 'Test & report agents',
    body: 'Automated generation matrices, failure collection, and weekly analysis reports for engineering and investors.',
  },
];

const INDUSTRIES = [
  {
    name: 'E-commerce & D2C',
    market: 'Global e-commerce GMV in the multi-trillion range; catalog and PDP creative is a major recurring cost.',
    use: 'SKU and pack consistency across PDP, ads, and seasonal drops without a full reshoot each time.',
    pain: 'Thousands of SKUs must look identical across channels.',
  },
  {
    name: 'Fashion & apparel',
    market: 'Global apparel retail is a multi-hundred-billion market; digital lookbooks and social drive discovery.',
    use: 'Lock model and garment identities; vary only set and campaign brief.',
    pain: 'Model and product drift across lookbooks and paid social.',
  },
  {
    name: 'FMCG / CPG',
    market: 'Packaged goods command large, continuous brand and trade creative budgets.',
    use: 'Pack and logo lock with lifestyle environments around the same SKU.',
    pain: 'Pack shape or logo drift weakens shelf and digital recognition.',
  },
  {
    name: 'Beauty & personal care',
    market: 'High creative velocity across social, e-commerce, and retail media.',
    use: 'Product and talent locks across Reels, ads, and detail pages.',
    pain: 'Shade, texture, and face consistency across hundreds of assets.',
  },
  {
    name: 'Real estate & interiors',
    market: 'Developers and portals invest heavily in listing and amenity visuals.',
    use: 'Environment lock for project style; brand lock for signage and campaigns.',
    pain: 'The same project must look coherent across listings and ads.',
  },
  {
    name: 'Agencies & in-house studios',
    market: 'Creative production is a large services layer on top of brand media spend.',
    use: 'Multi-brand identity banks and faster client iteration cycles.',
    pain: 'Clients reject work when product or brand misses guidelines.',
  },
  {
    name: 'Automotive & durables',
    market: 'High-consideration categories where hero product imagery drives trust.',
    use: 'Product lock (vehicle or line) plus environment (showroom, road, lifestyle).',
    pain: 'Wrong proportion or badge detail destroys credibility.',
  },
  {
    name: 'Entertainment & character IP',
    market: 'Promotional art and merch require strict likeness control.',
    use: 'Character identity lock across posters, social, and mockups.',
    pain: 'Character drift breaks fan and licensor trust.',
  },
];

const BUILD_NEEDS = [
  {
    title: 'Image generation',
    items: [
      'Production image pipeline (e.g., ComfyUI or cloud image APIs)',
      'Reference-conditioned generation paths',
      'Queue, retry, cancel, and seed control for reproducible runs',
    ],
  },
  {
    title: 'Video generation',
    items: [
      'Short-form video path wired to the same locked identities',
      'Motion and duration controls in the Studio brief',
      'Storage and delivery path for pilot outputs',
    ],
  },
  {
    title: 'Identity & data',
    items: [
      'Database for identities, assets, and generation jobs',
      'Object storage for references and outputs',
      'Optional vector search for asset discovery',
    ],
  },
  {
    title: 'Vision & scoring',
    items: [
      'Vision models for identity analysis',
      'Consistency scoring against locked anchors',
      'Optional segmentation for multi-type extraction from one plate',
    ],
  },
  {
    title: 'GPU & compute',
    items: [
      'GPU capacity for image and video pilots (on-prem or cloud)',
      'API servers, workers, and monitoring',
      'Headroom for large test batches and re-runs',
    ],
  },
  {
    title: 'AI agents (operations)',
    items: [
      'Test agent: run generation matrices and capture failures',
      'Report agent: summarize scores, drift, and regressions',
      'Assist agents for prompt QA and batch operations',
    ],
  },
];

const TESTING = [
  {
    month: 'Months 1–2',
    title: 'Small output — core path',
    items: [
      'Lock → Studio → single-image generation on a controlled set',
      'Four-layer extract from one plate; file and duplicate edge cases',
      'Consistency score baseline on a defined pair set',
      'Admin access, asset bank, and recycle flows stabilized',
    ],
  },
  {
    month: 'Months 2–4',
    title: 'Scale matrix — multi-identity',
    items: [
      'Combinations: product + character, plus brand and environment',
      'Batch runs (hundreds of generations) and queue reliability',
      'Short video pilots on the same locks',
      'Cross-provider checks as backends are swapped',
    ],
  },
  {
    month: 'Months 4–6',
    title: 'Large testing — pilot readiness',
    items: [
      'Industry sample packs (e-commerce, fashion, CPG plates)',
      'Agent-driven weekly regression reports',
      'Score thresholds tuned with human review samples',
      'Load, failure recovery, and cost-per-asset metrics for investors',
    ],
  },
];

const FUND_USE = [
  { area: 'Engineering & product', pct: '35–40%', why: 'Identity Lock, Studio, Check, video path, reliability' },
  { area: 'GPU & generation infrastructure', pct: '20–25%', why: 'Image and video pilots, workers, storage egress' },
  { area: 'Testing program (3–6 months)', pct: '15–20%', why: 'From small outputs to large matrices plus human review' },
  { area: 'AI agents (test & reports)', pct: '8–12%', why: 'Automated runs, analysis, and ops assistance' },
  { area: 'Cloud operations', pct: '8–10%', why: 'Compute, database, object storage, monitoring' },
  { area: 'Legal & IP path', pct: '5–8%', why: 'Copyright posture and patent preparation (18-month window)' },
];

const WHY = [
  {
    title: 'A specific problem—not a generic AI story',
    body: 'Capital funds a creative identity lock system. The pitch is not “AI is a large market.” The pitch is identity drift is expensive, and almost no product owns the lock-and-score layer.',
  },
  {
    title: 'Lock once, run many campaigns',
    body: 'Product, character, brand, and environment stay fixed while briefs change. That is operational leverage agencies and brand teams already understand.',
  },
  {
    title: 'Measurable quality',
    body: 'A consistency score before publish turns taste debates into a gate enterprises can adopt.',
  },
  {
    title: 'Model-agnostic architecture',
    body: 'Image and video backends can change. The identity layer remains the durable product surface—lowering long-term vendor lock-in risk.',
  },
];

const FLOW = [
  { n: '1', title: 'Lock identity', body: 'Product · character · brand · environment from approved references' },
  { n: '2', title: 'Brief in Studio', body: 'Goal, scene, composition, style—same locks, new campaign' },
  { n: '3', title: 'Generate & check', body: 'Image or video, then consistency score before publish' },
];

function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="#top">
          <span className="brand-mark">B</span>
          Brand OS
        </a>
        <nav className="nav-links">
          <a href="#problem">Problem</a>
          <a href="#solution">Solution</a>
          <a href="#industries">Industries</a>
          <a href="#build">Build requirements</a>
          <a href="#testing">Testing</a>
          <a href="#invest">Why invest</a>
          <a href="#legal">IP</a>
        </nav>
        <a className="btn btn-primary" href="#invest">
          Why invest
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div>
          <div className="eyebrow">Rhodeotech · Brand OS</div>
          <h1>
            Creative identity lock—<span>not another generic AI tool</span>
          </h1>
          <p className="lead">
            Brands lose money when product, talent, logo, and environment shift in every generated asset. Brand OS locks
            those four identities once, then runs image and video campaigns with a consistency score. Investment builds
            this system—engineering, GPU capacity, a three-to-six-month testing program, and AI agents that prove it at
            scale.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#problem">
              The problem we own
            </a>
            <a className="btn btn-ghost" href="#invest">
              Where capital goes
            </a>
          </div>
          <div className="stats">
            <div className="stat">
              <b>4</b>
              <span>Identity types</span>
            </div>
            <div className="stat">
              <b>8</b>
              <span>Industry verticals</span>
            </div>
            <div className="stat">
              <b>3–6</b>
              <span>Months of hard testing</span>
            </div>
          </div>
        </div>
        <div className="hero-card">
          <h3>Investor focus</h3>
          <div className="flow">
            {FLOW.map((s) => (
              <div className="flow-step" key={s.n}>
                <div className="flow-num">{s.n}</div>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Problems() {
  return (
    <section id="problem" className="alt">
      <div className="container">
        <div className="section-head">
          <h2>The problem—why this company exists</h2>
          <p>
            Generative AI made images inexpensive. It did not make brand-consistent images reliable. That gap is the
            entire thesis. Below is what production teams feel every week.
          </p>
        </div>
        <div className="grid-2">
          {PROBLEMS.map((p) => (
            <div className="card" key={p.title}>
              <div className="icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Why capital belongs here—not in “more AI”</h3>
          <p>
            Funding Brand OS buys a <strong style={{ color: 'var(--text)' }}>governance layer on top of generation</strong>
            : lock, reuse, and score. Tools that only sell prompts or raw generation leave brand risk with the customer.
            The company that owns the identity lock owns the workflow enterprises will pay to keep stable.
          </p>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section id="solution">
      <div className="container">
        <div className="section-head">
          <h2>Solution—Brand OS</h2>
          <p>Four identity types. One lock. Campaign briefs change; identity does not—unless you unlock it.</p>
        </div>
        <div className="grid-4">
          {[
            ['Product', 'SKU, packaging, apparel'],
            ['Character', 'Talent or persona'],
            ['Brand', 'Logo and marks'],
            ['Environment', 'Set or location'],
          ].map(([t, d]) => (
            <div className="card" key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
        <div className="section-head" style={{ marginTop: 36 }}>
          <h2>Product capabilities</h2>
          <p>Built for teams that need consistency, not novelty generation alone.</p>
        </div>
        <div className="grid-2">
          {FEATURES.map((f) => (
            <div className="card" key={f.title}>
              <div className="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section id="industries" className="alt">
      <div className="container">
        <div className="section-head">
          <h2>Industries we cover</h2>
          <p>
            The focus is not “everyone who uses AI.” It is sectors where{' '}
            <strong style={{ color: 'var(--text)' }}>visual identity repeatability</strong> is real money. Market notes
            are directional context. The investable wedge is the lock layer inside these budgets.
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Industry</th>
                <th>Market context</th>
                <th>How Brand OS is used</th>
                <th>Core pain</th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRIES.map((ind) => (
                <tr key={ind.name}>
                  <td>
                    <strong>{ind.name}</strong>
                  </td>
                  <td>{ind.market}</td>
                  <td>{ind.use}</td>
                  <td>{ind.pain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>How we size “our” market</h3>
          <p>
            We are not asking anyone to fund “all of AI.” We are asking them to fund the slice where brands already spend
            on catalog, campaign, and agency production—and where inconsistency is a visible cost. Each vertical above
            already buys photography, CGI, and increasingly generative tools. Brand OS sits where those tools fail on
            identity.
          </p>
        </div>
      </div>
    </section>
  );
}

function Build() {
  return (
    <section id="build">
      <div className="container">
        <div className="section-head">
          <h2>What it takes to build this</h2>
          <p>
            This list shows investors <strong style={{ color: 'var(--text)' }}>where money is spent</strong>—on concrete
            systems, not abstract “AI research.”
          </p>
        </div>
        <div className="grid-2">
          {BUILD_NEEDS.map((b) => (
            <div className="card" key={b.title}>
              <h3>{b.title}</h3>
              <ul>
                {b.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Minimum production stack</h3>
          <p>
            An image generation toolchain, a video generation path, GPU capacity (or cloud GPU), an identity database,
            object storage, vision scoring, and test/report agents. Without these, a demo is possible. Without these, an
            industry pilot is not.
          </p>
        </div>
      </div>
    </section>
  );
}

function Testing() {
  return (
    <section id="testing" className="alt">
      <div className="container">
        <div className="section-head">
          <h2>Testing program—three to six months</h2>
          <p>
            Work moves from small outputs to large matrix testing. In this window, GPU, storage, human review, and AI
            agents all require dedicated funding. This is not optional polish—it is the evidence that the system holds at
            scale.
          </p>
        </div>
        <div className="grid-3">
          {TESTING.map((ph) => (
            <div className="card" key={ph.month}>
              <span className="pill">{ph.month}</span>
              <h3 style={{ marginTop: 10 }}>{ph.title}</h3>
              <ul>
                {ph.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>AI agents for testing and reports</h3>
            <ul>
              <li>Scheduled generation matrices (identity combinations × briefs)</li>
              <li>Collection of failures, timeouts, and score drops</li>
              <li>Weekly analysis reports for engineering and investors</li>
              <li>Support for prompt QA and regression diffs</li>
            </ul>
            <p style={{ marginTop: 10 }}>
              Agents reduce manual QA cost but require compute budget and engineering time—hence a separate funding line.
            </p>
          </div>
          <div className="card">
            <h3>GPU and capacity requirements</h3>
            <ul>
              <li>Concurrent image jobs for batch tests</li>
              <li>Video pilot runs (heavier than stills)</li>
              <li>Vision model calls for analysis and scoring</li>
              <li>Headroom for re-runs when models or workflows change</li>
            </ul>
            <p style={{ marginTop: 10 }}>
              Without a three-to-six-month test cycle, market claims stay weak. Spend here builds evidence—not vanity
              demos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Invest() {
  return (
    <section id="invest">
      <div className="container">
        <div className="section-head">
          <h2>Why invest—and where the money goes</h2>
          <p>
            Thesis: <strong style={{ color: 'var(--text)' }}>identity drift is expensive</strong> across e-commerce,
            fashion, CPG, beauty, real estate, and agencies. Brand OS is the lock-and-score layer. Capital builds and
            proves that layer—not a generic AI narrative.
          </p>
        </div>
        <div className="grid-2">
          {WHY.map((w) => (
            <div className="card" key={w.title}>
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </div>
          ))}
        </div>
        <h3 style={{ margin: '28px 0 12px' }}>Indicative use of funds</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Use of funds</th>
                <th>Share</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {FUND_USE.map((f) => (
                <tr key={f.area}>
                  <td>
                    <strong>{f.area}</strong>
                  </td>
                  <td>{f.pct}</td>
                  <td>{f.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>What funded testing should show in three to six months</h3>
          <ul>
            <li>Documented consistency baselines on real industry sample packs</li>
            <li>A stable image path and a credible short-video path on locked identities</li>
            <li>Cost-per-asset and failure-rate numbers—not screenshots alone</li>
            <li>Agent-generated test reports readable like an operations dashboard</li>
          </ul>
        </div>
        <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Contact: <a href="mailto:ersharaddubey@rgmail.com">ersharaddubey@rgmail.com</a>. Product access is admin-only; there
          is no public self-registration.
        </p>
      </div>
    </section>
  );
}

function Legal() {
  return (
    <section id="legal" className="alt">
      <div className="container">
        <div className="section-head">
          <h2>Intellectual property</h2>
          <p>Status for investors and diligence reviewers.</p>
        </div>
        <div className="legal-box">
          <h3>Copyright</h3>
          <p>
            The Brand OS software—including source code, user interface, documentation, workflows, and the creative
            identity system design—is the exclusive intellectual property of{' '}
            <strong style={{ color: 'var(--text)' }}>Rhodeotech</strong>. All rights reserved. Unauthorized copying,
            redistribution, or derivative commercial use is prohibited.
          </p>
          <h3 style={{ marginTop: 18 }}>Patent path</h3>
          <p>
            Core methods of the creative identity lock system (multi-type identity extraction, lock governance, and
            consistency-checked generation) are treated as proprietary. A formal software patent application is planned
            within the <strong style={{ color: 'var(--text)' }}>next 18 months</strong>. Until grant, trade-secret and
            copyright protection apply. Third parties must not file conflicting claims based on confidential demos or
            materials shared under NDA.
          </p>
          <h3 style={{ marginTop: 18 }}>Confidentiality</h3>
          <p>
            Materials shared for evaluation are confidential unless marked otherwise. Demo access is admin-controlled.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          © {year} Rhodeotech · Brand OS. All rights reserved. Copyright protected. Patent application planned within 18
          months.
        </div>
        <div>Investor materials focused on identity lock—not generic AI hype.</div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problems />
        <Solution />
        <Industries />
        <Build />
        <Testing />
        <Invest />
        <Legal />
      </main>
      <Footer />
    </>
  );
}
