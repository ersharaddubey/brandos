import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api';
import { cld } from '../lib/cloudinary';
import { MOSAIC, SIZES, SPAN, sizeOf } from '../lib/gallerySize';

const BATCH = 4; // files sent per request

export default function GalleryAdmin() {
  const [items, setItems] = useState(null);
  const [cloud, setCloud] = useState(null);
  const [msg, setMsg] = useState(null);
  const [progress, setProgress] = useState('');
  const [dragFrom, setDragFrom] = useState(-1);
  const [over, setOver] = useState(false);
  const input = useRef(null);

  const load = useCallback(() => {
    api.get('/gallery').then((r) => setItems(r.data)).catch((e) => setMsg({ err: true, text: errMsg(e) }));
  }, []);
  useEffect(() => {
    load();
    api.get('/gallery/status').then((r) => setCloud(r.data.cloudinary)).catch(() => {});
  }, [load]);

  const upload = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return setMsg({ err: true, text: 'Choose image files (JPG, PNG, WEBP).' });
    setMsg(null);
    let done = 0;
    try {
      for (let i = 0; i < files.length; i += BATCH) {
        const part = files.slice(i, i + BATCH);
        setProgress(`Uploading ${Math.min(done + 1, files.length)}–${done + part.length} of ${files.length}…`);
        const fd = new FormData();
        part.forEach((f) => fd.append('images', f));
        const { data } = await api.post('/gallery', fd);
        setItems((cur) => [...(cur || []), ...data]);
        done += part.length;
      }
      setMsg({ text: `${done} photo${done > 1 ? 's' : ''} added` });
    } catch (e) {
      setMsg({ err: true, text: `${errMsg(e)}${done ? ` (${done} uploaded before the error)` : ''}` });
    } finally { setProgress(''); if (input.current) input.current.value = ''; }
  };

  const patch = async (it, change) => {
    setItems((c) => c.map((x) => (x._id === it._id ? { ...x, ...change } : x)));
    try { await api.put(`/gallery/${it._id}`, change); }
    catch (err) { setMsg({ err: true, text: errMsg(err) }); load(); }
  };

  const reorder = async (from, to) => {
    if (from === to || from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setItems(next);
    try { await api.put('/gallery/reorder', { ids: next.map((x) => x._id) }); }
    catch (err) { setMsg({ err: true, text: errMsg(err) }); load(); }
  };

  const remove = async (it) => {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    try { await api.delete(`/gallery/${it._id}`); setItems((c) => c.filter((x) => x._id !== it._id)); setMsg({ text: 'Photo deleted' }); }
    catch (err) { setMsg({ err: true, text: errMsg(err) }); }
  };

  return (
    <>
      <div className="section__head">
        <div><h1>Gallery</h1><p className="muted">Upload photos, pick a size for each one and drag to reorder. The website shows them in this order, in the sizes you choose.</p></div>
      </div>

      {cloud === false && <div className="notice">Cloudinary is not connected, so photos are saved on this server. Add <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code> to <code>server/.env</code> and restart (see README).</div>}
      {cloud === true && <div className="notice notice--ok">Cloudinary connected: photos are stored and delivered from Cloudinary.</div>}
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}

      <section className="card" style={{ marginBottom: '1.4rem' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (dragFrom < 0 && e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
          className={`grid place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${over ? 'border-[var(--gold)] bg-white/60' : 'border-[var(--gold-light)] bg-white/30'}`}
        >
          <p style={{ margin: 0, fontSize: '1.05rem' }}>{progress || 'Drag photos here, or choose files'}</p>
          <p className="muted small" style={{ margin: '.3rem 0 1rem' }}>JPG, PNG or WEBP, up to 10 MB each. You can select many at once.</p>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button type="button" className="btn btn--gold" disabled={!!progress} onClick={() => input.current?.click()}>{progress ? 'Uploading…' : 'Choose photos'}</button>
        </div>
      </section>

      {!items ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">No photos yet. Upload your first photos above.</p> : (
        <>
          <h3>Your photos ({items.length})</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ marginBottom: '2rem' }}>
            {items.map((it, k) => (
              <div
                key={it._id}
                draggable
                onDragStart={() => setDragFrom(k)}
                onDragEnd={() => setDragFrom(-1)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragFrom >= 0) reorder(dragFrom, k); setDragFrom(-1); }}
                className={`card ${dragFrom === k ? 'opacity-40' : ''}`}
                style={{ padding: '.7rem', cursor: 'grab' }}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/10">
                  <img src={cld(it.url, 'w_500,c_limit')} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{k + 1}</span>
                </div>
                <input
                  defaultValue={it.caption}
                  placeholder="Caption (optional)"
                  maxLength={200}
                  onBlur={(e) => { if (e.target.value !== it.caption) patch(it, { caption: e.target.value }); }}
                  style={{ width: '100%', marginTop: '.6rem', padding: '.55rem .7rem' }}
                />
                <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem', alignItems: 'center' }}>
                  <select value={it.size || 'auto'} onChange={(e) => patch(it, { size: e.target.value })} style={{ flex: 1, padding: '.5rem .6rem' }} aria-label="Tile size">
                    {SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="btn btn--line btn--sm" disabled={k === 0} onClick={() => reorder(k, k - 1)} aria-label="Move earlier">←</button>
                  <button className="btn btn--line btn--sm" disabled={k === items.length - 1} onClick={() => reorder(k, k + 1)} aria-label="Move later">→</button>
                  <button className="btn btn--line btn--sm danger" onClick={() => remove(it)} aria-label="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>

          <h3>Live layout preview</h3>
          <p className="muted small">This is how the Gallery page lays out your photos (on a desktop screen).</p>
          <div className={MOSAIC}>
            {items.map((it, k) => (
              <div key={it._id} className={`overflow-hidden rounded-2xl bg-black/10 ${SPAN[sizeOf(it.size, k)]}`}>
                <img src={cld(it.url, 'w_700,c_limit')} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
