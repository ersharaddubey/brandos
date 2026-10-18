import { useRef, useState } from 'react';
import api, { errMsg } from '../api';
import { cld } from '../lib/cloudinary';
import { PLACEHOLDER } from '../lib/placeholder';

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await api.post('/upload', fd);
  return data.url;
}

const thumb = (u) => (u ? cld(u, 'w_400,c_limit') : PLACEHOLDER);

/* One photo: dummy image until a file is uploaded. No links, upload only. */
export function ImageField({ value, onChange, aspect = 'aspect-[4/3]', label = 'photo' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file) => {
    if (!file) return;
    setBusy(true); setErr('');
    try { onChange(await uploadImage(file)); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  return (
    <div className="imgfield">
      <div className={`imgfield__frame ${aspect}`}>
        <img src={thumb(value)} alt="" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} />
        {!value && <span className="imgfield__tag">Dummy image</span>}
        {busy && <span className="imgfield__busy">Uploading…</span>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
      <div className="imgfield__btns">
        <button type="button" className="btn btn--gold btn--sm" disabled={busy} onClick={() => input.current?.click()}>{value ? `Change ${label}` : `Upload ${label}`}</button>
        {value && <button type="button" className="btn btn--line btn--sm" onClick={() => onChange('')}>Remove</button>}
      </div>
      {err && <small className="imgfield__err">{err}</small>}
    </div>
  );
}

/* Many photos: grid of uploaded photos (first = cover) plus a dummy "add" tile. value = array of urls */
export function ImagesField({ value = [], onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setBusy(true); setErr('');
    const urls = [];
    try { for (const f of files) urls.push(await uploadImage(f)); } catch (e) { setErr(errMsg(e)); }
    if (urls.length) onChange([...value, ...urls]);
    setBusy(false);
    if (input.current) input.current.value = '';
  };
  const remove = (i) => onChange(value.filter((_, k) => k !== i));
  const cover = (i) => onChange([value[i], ...value.filter((_, k) => k !== i)]);

  return (
    <div className="imgfield">
      <div className="imgfield__grid">
        {value.map((u, i) => (
          <div className="imgfield__item" key={`${u}-${i}`}>
            <div className="imgfield__frame aspect-[4/3]"><img src={thumb(u)} alt="" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} />{i === 0 && <span className="imgfield__tag imgfield__tag--gold">Cover</span>}</div>
            <div className="imgfield__mini">
              {i > 0 && <button type="button" onClick={() => cover(i)}>Make cover</button>}
              <button type="button" className="danger" onClick={() => remove(i)}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="imgfield__item imgfield__add" disabled={busy} onClick={() => input.current?.click()}>
          <div className="imgfield__frame aspect-[4/3]">
            <img src={PLACEHOLDER} alt="" />
            <span className="imgfield__plus">{busy ? 'Uploading…' : '+ Upload photos'}</span>
          </div>
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      {err && <small className="imgfield__err">{err}</small>}
    </div>
  );
}
