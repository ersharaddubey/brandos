// Settings list fields are saved as lines like "Title | detail". These helpers turn them into structures.
const trim = (x) => String(x || '').trim();
const first = (line) => {
  const i = String(line).indexOf('|');
  return i === -1 ? [trim(line), ''] : [trim(line.slice(0, i)), trim(line.slice(i + 1))];
};

// "Bathroom | Towels, Slippers" -> { title, items }
export const parseGroups = (lines = []) => lines
  .map((l) => { const [title, rest] = first(l); return { title, items: rest.split(',').map(trim).filter(Boolean) }; })
  .filter((g) => g.title && g.items.length);

// "Category | Place | distance" (or "Place | distance") -> [{ title, items: [{ name, dist }] }]
export const parseNearby = (lines = []) => {
  const map = new Map();
  lines.forEach((l) => {
    const p = String(l).split('|').map(trim);
    const [cat, name, dist] = p.length >= 3 ? p : ['Nearby', p[0], p[1]];
    if (!name) return;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push({ name, dist });
  });
  return [...map].map(([title, items]) => ({ title, items }));
};

// "Question | Answer"
export const parseFaqs = (lines = []) => lines.map((l) => { const [q, a] = first(l); return { q, a }; }).filter((f) => f.q && f.a);

// "Staff | 9.5"
export const parseScores = (lines = []) => lines
  .map((l) => { const [label, v] = first(l); return { label, value: parseFloat(v) }; })
  .filter((x) => x.label && !Number.isNaN(x.value));

// "Name | Country | Review text"
export const parseReviews = (lines = []) => lines.map((l) => {
  const p = String(l).split('|').map(trim);
  return p.length >= 3 ? { name: p[0], country: p[1], text: p.slice(2).join(' | ') } : { name: p[0], country: '', text: p[1] || '' };
}).filter((r) => r.text);

export const paras = (t = '') => String(t).split(/\n+/).map((x) => x.trim()).filter(Boolean);

// "1 large double bed" -> as is; "King" -> "King bed"
export const bedLabel = (b = '') => (/bed|futon/i.test(b) ? b : `${b} bed`);

// Ids of the home page sections. The mega menu and footer link to these.
export const SECTIONS = { about: 'about', rooms: 'rooms', reviews: 'reviews', facilities: 'facilities', dining: 'dining', nearby: 'nearby', info: 'info', faq: 'faq', contact: 'contact' };

// ---------- Home page / media content ----------
const split = (l) => String(l).split('|').map(trim);

// "Image URL | Headline | Sub-line"
export const parseSlides = (lines = []) => lines.map((l) => { const p = split(l); return { img: p[0], title: p[1] || '', sub: p.slice(2).join(' | ') }; }).filter((s) => s.img);
// "Image URL | Caption"
export const parseGallery = (lines = []) => lines.map((l) => { const p = split(l); return { src: p[0], caption: p.slice(1).join(' | ') }; }).filter((g) => g.src);
// "Title | Description | Image URL"
export const parseExperiences = (lines = []) => lines.map((l) => { const p = split(l); return { title: p[0], desc: p[1] || '', img: p[2] || '' }; }).filter((x) => x.title);
// "Title | When | Description | Image URL"
export const parseEvents = (lines = []) => lines.map((l) => { const p = split(l); return { title: p[0], when: p[1] || '', desc: p[2] || '', img: p[3] || '' }; }).filter((x) => x.title);
// "Title | Description"
export const parsePairs = (lines = []) => lines.map((l) => { const [title, desc] = first(l); return { title, desc }; }).filter((x) => x.title);
// "page | Heading | Text" (|| = new paragraph)
export const parseBlocks = (lines = [], page = '') => lines.map((l) => {
  const p = split(l);
  return { page: (p[0] || '').toLowerCase(), title: p[1] || '', paras: (p.slice(2).join(' | ')).split('||').map(trim).filter(Boolean) };
}).filter((b) => b.page === page && (b.title || b.paras.length));

export const youtubeId = (url = '') => {
  const m = String(url).match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
};
export const instagramEmbed = (url = '') => {
  const m = String(url).match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/);
  return m ? `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed/` : '';
};

export const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null);
export const isoDay = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
