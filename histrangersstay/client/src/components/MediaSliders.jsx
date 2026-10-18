import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Instagram, Youtube } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { igUrl, ytUrl } from '../config';
import { youtubeId, instagramEmbed } from '../lib/parse';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import YouTubePlayer from './YouTubePlayer';

// Horizontal swipe / scroll-snap rail with arrow buttons
function Rail({ children, light = false, count = 0 }) {
  const rail = useRef(null);
  const by = (d) => {
    const el = rail.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = (card ? card.getBoundingClientRect().width : el.clientWidth * 0.8) + 20;
    el.scrollBy({ left: d * step, behavior: 'smooth' });
  };
  const btn = `grid h-12 w-12 place-items-center rounded-full border transition ${light ? 'border-white/40 text-white hover:bg-white hover:text-ink' : 'border-ink/25 text-ink hover:bg-ink hover:text-white'}`;
  return (
    <div>
      <div ref={rail} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        {children}
      </div>
      {count > 1 && (
        <div className="mt-4 flex justify-center gap-3">
          <button type="button" onClick={() => by(-1)} aria-label="Previous" className={btn}><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => by(1)} aria-label="Next" className={btn}><ChevronRight size={20} /></button>
        </div>
      )}
    </div>
  );
}

// ---------- YouTube slider (click a thumbnail to play it right there) ----------
export function YouTubeSlider({ id = 'video' }) {
  const { settings: s } = useSettings();
  const ids = (s.youtubeUrls || []).map(youtubeId).filter(Boolean);
  const [playing, setPlaying] = useState('');
  if (!ids.length) return null;

  return (
    <section id={id} className="band-dark py-20 text-white md:py-28">
      <div className="wrap">
        <SectionHeading light eyebrow="YouTube" title={s.videoTitle || 'See the stay in motion'} text={s.videoText || 'A short film of the rooms, mountain views and daily life at the property.'} />
        <Reveal>
          <Rail light count={ids.length}>
            {ids.map((vid) => (
              <div key={vid} className="w-[86%] shrink-0 snap-center sm:w-[460px] sm:snap-start">
                <YouTubePlayer id={vid} playing={playing === vid} onPlay={() => setPlaying(vid)} />
              </div>
            ))}
          </Rail>
        </Reveal>
        {(s.youtube || ids.length > 0) && (
          <div className="mt-10 text-center">
            <a href={s.youtube ? ytUrl(s.youtube) : `https://www.youtube.com/watch?v=${ids[0]}`} target="_blank" rel="noreferrer" className="bt-ghost">
              <Youtube size={16} /> {s.youtube ? 'Visit our YouTube channel' : 'Watch on YouTube'}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Instagram slider (reels / posts shown in place, as before) ----------
export function InstagramSlider({ id = 'instagram' }) {
  const { settings: s } = useSettings();
  const embeds = (s.instagramUrls || []).map(instagramEmbed).filter(Boolean);
  if (!embeds.length) return null;
  const handle = s.instagram ? String(s.instagram).replace(/^@/, '') : '';

  return (
    <section id={id} className="band py-20 md:py-28">
      <div className="wrap">
        <SectionHeading eyebrow="Instagram" title="Moments from the valley" text={handle ? `Reels and posts from @${handle}. Swipe through, or tap one to open it.` : 'Reels and posts from our Instagram. Swipe through.'} />
        <Reveal>
          <Rail count={embeds.length}>
            {embeds.map((src, i) => (
              <div key={src} className="w-[82%] shrink-0 snap-center sm:w-[340px] sm:snap-start">
                <div className="overflow-hidden rounded-3xl glass-strong p-1.5">
                  <iframe src={src} title={`Instagram ${i + 1}`} loading="lazy" className="h-[560px] w-full border-0" allowFullScreen />
                </div>
              </div>
            ))}
          </Rail>
        </Reveal>
        {handle && (
          <div className="mt-10 text-center">
            <a href={igUrl(handle)} target="_blank" rel="noreferrer" className="bt-dark"><Instagram size={16} /> Follow @{handle} on Instagram</a>
          </div>
        )}
      </div>
    </section>
  );
}
