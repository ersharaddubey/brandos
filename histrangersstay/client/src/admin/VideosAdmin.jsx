import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useSettings } from '../SettingsContext';
import { youtubeId, instagramEmbed } from '../lib/parse';
import LinkList from './LinkList';

// Home page videos: one YouTube link and one Instagram link per line
export default function VideosAdmin() {
  const { refresh } = useSettings();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get('/settings').then((r) => setF({
      videoTitle: r.data.videoTitle || '',
      videoText: r.data.videoText || '',
      youtubeUrls: r.data.youtubeUrls || [],
      instagramUrls: r.data.instagramUrls || [],
    })).catch((e) => setMsg({ err: true, text: errMsg(e) }));
  }, []);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api.put('/settings', {
        videoTitle: f.videoTitle,
        videoText: f.videoText,
        youtubeUrls: f.youtubeUrls.map((x) => x.trim()).filter(Boolean),
        instagramUrls: f.instagramUrls.map((x) => x.trim()).filter(Boolean).slice(0, 12),
      });
      await refresh();
      setMsg({ text: 'Saved. Home page sliders, YouTube Gallery and Instagram Gallery now show these videos.' });
    } catch (err) { setMsg({ err: true, text: errMsg(err) }); } finally { setBusy(false); }
  };

  if (!f) return msg ? <div className="notice notice--err">{msg.text}</div> : <p className="muted">Loading…</p>;

  const ytIds = f.youtubeUrls.map(youtubeId).filter(Boolean);

  return (
    <form onSubmit={save} className="settings">
      <div className="section__head">
        <div><h1>Home videos</h1><p className="muted">Paste a link on each line. The video section shows on the home page as soon as one valid link is saved.</p></div>
        <button className="btn btn--dark btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}

      <section className="card settings__group">
        <h3>YouTube video</h3>
        <LinkList value={f.youtubeUrls} onChange={(v) => set('youtubeUrls', v)} placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…" isValid={(v) => !!youtubeId(v)} addLabel="Add another YouTube video" />
        {ytIds.length > 0 && (
          <div className="vthumbs">{ytIds.map((id) => <img key={id} src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" />)}</div>
        )}
        <small className="muted">Watch, share, shorts and youtu.be links all work.</small>
      </section>

      <section className="card settings__group">
        <h3>Instagram reel or post</h3>
        <LinkList value={f.instagramUrls} onChange={(v) => set('instagramUrls', v)} placeholder="https://www.instagram.com/reel/XXXX/" isValid={(v) => !!instagramEmbed(v)} addLabel="Add another Instagram link" />
        <small className="muted">Up to 12 links are shown in the Instagram slider on the home page and on the Instagram Gallery page (Social → Instagram Gallery). Your profile handle is set in Site settings → Contact.</small>
      </section>

      <section className="card settings__group">
        <h3>Section heading (optional)</h3>
        <label><span>Title</span><input value={f.videoTitle} onChange={(e) => set('videoTitle', e.target.value)} /></label>
        <label><span>Short text</span><input value={f.videoText} onChange={(e) => set('videoText', e.target.value)} /></label>
      </section>

      <div className="drawer__foot"><button className="btn btn--dark" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  );
}
