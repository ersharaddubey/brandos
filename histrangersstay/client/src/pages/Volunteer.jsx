import { useState } from 'react';
import { Check } from 'lucide-react';
import api, { errMsg } from '../api';
import PageTop from '../components/PageTop';

const MIN = 5000;
const empty = { name: '', age: '', email: '', instagram: '', youtube: '', followers: '', skills: '', why: '' };

export default function Volunteer() {
  const [f, setF] = useState(empty);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.instagram.trim() && !f.youtube.trim()) return setError('Please share your Instagram or YouTube link');
    if (Number(f.followers) < MIN) return setError(`We currently collaborate with creators who have at least ${MIN.toLocaleString('en-IN')} followers`);
    if (!file) return setError('Please attach your resume (PDF or Word, max 2 MB)');
    if (file.size > 2 * 1024 * 1024) return setError('Resume is too large. Maximum 2 MB.');
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    fd.append('resume', file);
    setBusy(true);
    try {
      const { data } = await api.post('/volunteers', fd);
      setDone(data.message); setF(empty); setFile(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="wrap max-w-xl pb-28 pt-44 text-center">
      <div className="surface p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/50 text-gold-700"><Check size={32} /></span>
        <h1 className="mt-5 text-4xl">Application received</h1>
        <p className="mt-3 text-ink/80">{done}</p>
      </div>
    </div>
  );

  return (
    <>
      <PageTop eyebrow="Volunteer and collaborate" title="Create with Hi Strangers" text={`We love working with creators and volunteers. Minimum ${MIN.toLocaleString('en-IN')} followers (Instagram or YouTube) to apply.`} />
      <form onSubmit={submit} className="wrap max-w-2xl pb-24">
        <div className="surface space-y-4 p-7 md:p-9">
          <label className="block"><span className="lbl">Name</span><input className="inp" value={f.name} onChange={set('name')} required /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="lbl">Age</span><input className="inp" type="number" min="14" max="99" value={f.age} onChange={set('age')} required /></label>
            <label className="block"><span className="lbl">Email</span><input className="inp" type="email" value={f.email} onChange={set('email')} required /></label>
          </div>
          <label className="block"><span className="lbl">Instagram link</span><input className="inp" placeholder="https://instagram.com/yourhandle" value={f.instagram} onChange={set('instagram')} /></label>
          <label className="block"><span className="lbl">YouTube link</span><input className="inp" placeholder="https://youtube.com/@yourchannel" value={f.youtube} onChange={set('youtube')} /></label>
          <label className="block"><span className="lbl">Total followers (minimum {MIN.toLocaleString('en-IN')})</span><input className="inp" type="number" min={MIN} value={f.followers} onChange={set('followers')} required /></label>
          <label className="block"><span className="lbl">Resume (PDF or Word, max 2 MB)</span><input className="inp" type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></label>
          <label className="block"><span className="lbl">Skills</span><textarea className="inp" rows="3" placeholder="Photography, reels, hosting, cooking…" value={f.skills} onChange={set('skills')} required /></label>
          <label className="block"><span className="lbl">Why should we select you?</span><textarea className="inp" rows="4" value={f.why} onChange={set('why')} required /></label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="bt-gold w-full" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button>
        </div>
      </form>
    </>
  );
}
