import { useState } from 'react';
import api, { errMsg } from '../api';
import CrudPage from './CrudPage';

const SECTIONS = [['all', 'All'], ['stay', 'Stay'], ['food', 'Food & cafe'], ['pending', 'Waiting for approval']];
const typeOf = (r) => r.type || 'stay'; // reviews saved before food reviews existed are stay reviews

// Guest reviews shown in the diary on the website. Stored in the database.
// Stay reviews and food reviews are shown in two separate sections on the Reviews page.
export default function ReviewsAdmin() {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [section, setSection] = useState('all');

  const importOld = async () => {
    if (!window.confirm('Copy the old "Guest reviews" lines from Site settings into this list? Reviews already copied are skipped.')) return;
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post('/reviews/import-from-settings');
      setMsg({ text: data.imported ? `${data.imported} review${data.imported > 1 ? 's' : ''} imported.` : 'Nothing new to import.' });
      setVersion((v) => v + 1);
    } catch (e) { setMsg({ err: true, text: errMsg(e) }); } finally { setBusy(false); }
  };

  const rowFilter = (r) => {
    if (section === 'all') return true;
    if (section === 'pending') return !r.published;
    return typeOf(r) === section;
  };

  return (
    <>
      <section className="card" style={{ marginBottom: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '.8rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="muted" style={{ margin: 0, maxWidth: '46rem' }}>
          Reviews show in the diary on the Reviews page, 10 per page, in this order (small number first, then newest). Pick <b>Stay</b> or <b>Food</b> for each review, so they appear in the right section.
          Reviews written by guests on the website arrive hidden: open one and switch on “Show on website” to publish it.
          Had reviews in Site settings before? Copy them over once:
        </p>
        <button type="button" className="btn btn--line btn--sm" onClick={importOld} disabled={busy}>{busy ? 'Importing…' : 'Import old reviews'}</button>
      </section>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div className="tabs">{SECTIONS.map(([key, label]) => <button key={key} className={section === key ? 'on' : ''} onClick={() => setSection(key)}>{label}</button>)}</div>

      <CrudPage
        key={version}
        title="Guest reviews"
        singular="Review"
        endpoint="/reviews"
        rowFilter={rowFilter}
        defaults={{ type: 'stay', rating: 5, published: true, order: 0 }}
        fields={[
          { name: 'type', label: 'Review is about', type: 'select', options: [{ value: 'stay', label: 'Stay (rooms and property)' }, { value: 'food', label: 'Food and cafe' }], hint: 'Stay reviews and food reviews are shown in separate sections.' },
          { name: 'name', label: 'Guest name', required: true },
          { name: 'country', label: 'City / country', hint: 'Optional, e.g. Delhi or Germany' },
          { name: 'rating', label: 'Stars (1 to 5)', type: 'number', min: 1, required: true },
          { name: 'text', label: 'Review', type: 'textarea', required: true, hint: 'Up to 1500 characters. Keep it in the guest’s own words.' },
          { name: 'stayedOn', label: 'Visited on (optional)', hint: 'Free text, e.g. Aug 2025' },
          { name: 'order', label: 'Position', type: 'number', hint: 'Smaller number shows first. Leave 0 to show newest first.' },
          { name: 'published', label: 'Show on website', type: 'checkbox' },
        ]}
        columns={[
          { label: 'Guest', render: (r) => <b>{r.name}</b> },
          { label: 'About', render: (r) => (typeOf(r) === 'food' ? 'Food' : 'Stay') },
          { label: 'Stars', render: (r) => '★'.repeat(r.rating || 0) },
          { label: 'Review', render: (r) => (r.text.length > 90 ? `${r.text.slice(0, 90)}…` : r.text) },
          { label: 'Shown', render: (r) => (r.published ? 'Yes' : 'Hidden') },
        ]}
      />
    </>
  );
}
