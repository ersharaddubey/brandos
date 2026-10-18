import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useSettings } from '../SettingsContext';
import { ImageField } from './ImageField';
import RowsEditor, { linesToRows, rowsToLines } from './RowsEditor';

const GROUPS = [
  { title: 'Brand and hero', fields: [
    { name: 'siteName', label: 'Property name', type: 'text' },
    { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'heroSubtitle', label: 'Hero sub-line', type: 'text' },
    { name: 'heroImage', label: 'Hero image', type: 'image', hint: 'Upload a photo. Wide landscape photos work best.' },
  ] },
  { title: 'Home page: Welcome section', fields: [
    { name: 'welcomeEyebrow', label: 'Small label above the heading', type: 'text', hint: 'Example: Welcome' },
    { name: 'welcomeTitle', label: 'Heading', type: 'text', hint: 'Leave empty to show “Welcome to” + your property name.' },
    { name: 'about', label: 'Description text', type: 'textarea', rows: 6, hint: 'Each new line becomes a paragraph. The first two show on the home page; the About page shows all of them.' },
    { name: 'highlights', label: 'Tick-mark points (What guests get)', type: 'lines', hint: 'One point per line, for example Free Wi-Fi. The first 6 show on the home page.' },
    { name: 'welcomeImage', label: 'Large photo', type: 'image', hint: 'Leave empty to use the first photo of your Gallery.' },
    { name: 'welcomeImage2', label: 'Small photo (bottom right)', type: 'image', hint: 'Leave empty to use the second photo of your Gallery.' },
  ] },
  { title: 'Home page slider and announcement', fields: [
    { name: 'announcement', label: 'Top announcement bar', type: 'text', hint: 'Short offer line shown above the menu on every page. Leave empty to hide.' },
    { name: 'popupEnabled', label: 'Show the offer pop-up (once per visit)', type: 'checkbox' },
    { name: 'heroSlides', label: 'Hero slides', type: 'rows', noun: 'Slide', addLabel: 'Add slide', hint: 'Upload a photo for each slide and add a headline.', cols: [{ key: 'img', type: 'image' }, { key: 'title', label: 'Headline', placeholder: 'Wake up to the Himalayas' }, { key: 'sub', label: 'Sub-line', placeholder: 'Terrace and balcony views' }] },
  ] },
  { title: 'Experiences and why guests choose you', fields: [
    { name: 'experiences', label: 'Experiences', type: 'rows', noun: 'Experience', addLabel: 'Add experience', cols: [{ key: 'title', label: 'Title' }, { key: 'desc', label: 'Description', type: 'area' }, { key: 'img', type: 'image' }] },
    { name: 'events', label: 'Events (Events page and home page)', type: 'rows', noun: 'Event', addLabel: 'Add event', cols: [{ key: 'title', label: 'Title', placeholder: 'Bonfire nights' }, { key: 'when', label: 'When', placeholder: 'Every Saturday' }, { key: 'desc', label: 'Description', type: 'area' }, { key: 'img', type: 'image' }] },
    { name: 'whyUs', label: 'Why stay with us', type: 'lines', rows: 5, hint: 'One per line as: Title | Description' },
  ] },
  { title: 'Stay page content', fields: [
    { name: 'stayIncludes', label: 'Included in every room', type: 'lines', hint: 'One item per line' },
    { name: 'stayInfo', label: 'Good to know (extra text)', type: 'textarea', rows: 4, hint: 'Each new line becomes a paragraph on the Stay page.' },
    { name: 'howToReach', label: 'How to reach us', type: 'textarea', rows: 3 },
  ] },
  { title: 'Extra content blocks (any page)', fields: [
    { name: 'customSections', label: 'Content blocks', type: 'lines', rows: 6, hint: 'One block per line as: page | Heading | Text. Page is one of home, stay, about, experiences, events, gallery, offers, reviews, contact. Use || inside the text for a new paragraph.' },
  ] },
  { title: 'Contact', fields: [
    { name: 'phone', label: 'Phone', type: 'text', hint: 'With country code, for example +91 98765 43210' },
    { name: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'Shows a WhatsApp button on every page' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'address', label: 'Address', type: 'textarea', rows: 2 },
    { name: 'mapLink', label: 'Google Maps link', type: 'text' },
    { name: 'instagram', label: 'Instagram handle', type: 'text', hint: 'Without the @' },
    { name: 'youtube', label: 'YouTube channel (handle or full URL)', type: 'text', hint: 'e.g. @histrangersstay or full youtube.com/@… link' },
  ] },
  { title: 'Stay information', fields: [
    { name: 'checkInTime', label: 'Check-in time', type: 'text' },
    { name: 'checkOutTime', label: 'Check-out time', type: 'text' },
    { name: 'taxPercent', label: 'Tax added to bookings (%)', type: 'number', hint: 'Confirm the correct GST rate for your room price with your accountant.' },
    { name: 'policies', label: 'House rules', type: 'lines', hint: 'One rule per line' },
    { name: 'finePrint', label: 'The fine print', type: 'textarea', rows: 2 },
  ] },
  { title: 'Surroundings (shown on home page and Explore menu)', fields: [
    { name: 'nearby', label: 'Nearby places', type: 'lines', rows: 8, hint: 'One per line as: Category | Place | distance. Example: Restaurants and cafes | Royal Cafe | 750 m' },
  ] },
  { title: 'Facilities, breakfast and activities (Facilities menu)', fields: [
    { name: 'facilityGroups', label: 'Facility groups', type: 'lines', rows: 12, hint: 'One group per line as: Group name | item, item, item. Example: Bathroom | Towels, Slippers, Bidet' },
    { name: 'breakfast', label: 'Breakfast options', type: 'lines', hint: 'One per line' },
    { name: 'activities', label: 'Activities', type: 'lines', hint: 'One per line' },
  ] },
  { title: 'Guest reviews', fields: [
    { name: 'reviewScore', label: 'Google / overall score (out of 10)', type: 'number', step: 0.1, max: 10 },
    { name: 'reviewLabel', label: 'Score label', type: 'text', hint: 'For example Superb' },
    { name: 'reviewCount', label: 'Number of Google reviews', type: 'number', step: 1 },
    { name: 'reviewCategories', label: 'Score by category', type: 'lines', rows: 7, hint: 'One per line as: Category | score. Example: Cleanliness | 9.5' },
    { name: 'googleReviews', label: 'Google reviews (shown on top)', type: 'lines', rows: 6, hint: 'One per line as: Guest name | Country | Review text. These appear above admin reviews.' },
    { name: 'reviews', label: 'Admin / guest reviews (shown below Google)', type: 'lines', rows: 6, hint: 'One per line as: Guest name | Country | Review text' },
  ] },
  { title: 'Questions and answers', fields: [
    { name: 'faqs', label: 'FAQ', type: 'lines', rows: 10, hint: 'One per line as: Question | Answer' },
  ] },
];

const Wrap = ({ as: Tag, ...rest }) => <Tag {...rest} />;

export default function AdminSettings() {
  const { refresh } = useSettings();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get('/settings').then((r) => {
      const f = { ...r.data };
      GROUPS.flatMap((g) => g.fields).forEach((x) => {
        if (x.type === 'lines') f[x.name] = (f[x.name] || []).join('\n');
        if (x.type === 'rows') f[x.name] = linesToRows(f[x.name] || [], x.cols);
      });
      setForm(f);
    }).catch((e) => setMsg({ err: true, text: errMsg(e) }));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const payload = { ...form };
    GROUPS.flatMap((g) => g.fields).forEach((x) => {
      if (x.type === 'lines') payload[x.name] = String(form[x.name] || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (x.type === 'rows') payload[x.name] = rowsToLines(form[x.name] || [], x.cols);
      if (x.type === 'number') payload[x.name] = Number(form[x.name]);
    });
    try {
      await api.put('/settings', payload);
      await refresh();
      setMsg({ text: 'Settings saved. The website now shows the new details.' });
    } catch (err) { setMsg({ err: true, text: errMsg(err) }); } finally { setBusy(false); }
  };

  if (!form) return msg ? <div className="notice notice--err">{msg.text}</div> : <p className="muted">Loading settings…</p>;

  return (
    <form onSubmit={save} className="settings">
      <div className="section__head">
        <h1>Site settings</h1>
        <button className="btn btn--dark btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      {GROUPS.map((g) => (
        <section className="card settings__group" key={g.title}>
          <h3>{g.title}</h3>
          {g.fields.map((f) => (
            <Wrap key={f.name} as={f.type === 'image' || f.type === 'rows' ? 'div' : 'label'} className={f.type === 'image' || f.type === 'rows' ? 'fieldbox' : undefined}>
              <span>{f.label}</span>
              {f.type === 'checkbox' ? (
                <input type="checkbox" checked={form[f.name] !== false && !!form[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
              ) : f.type === 'image' ? (
                <ImageField value={form[f.name]} onChange={(url) => set(f.name, url)} aspect="aspect-[16/7]" />
              ) : f.type === 'rows' ? (
                <RowsEditor rows={form[f.name] || []} onChange={(rows) => set(f.name, rows)} fields={f.cols} noun={f.noun} addLabel={f.addLabel} />
              ) : f.type === 'textarea' || f.type === 'lines' ? (
                <textarea rows={f.rows || 4} value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === 'number' ? (
                <input type="number" min="0" max={f.max} step={f.step || 0.5} value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
              ) : (
                <input value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
              )}
              {f.hint && <small className="muted">{f.hint}</small>}
            </Wrap>
          ))}
        </section>
      ))}
      <div className="drawer__foot"><button className="btn btn--dark" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  );
}
