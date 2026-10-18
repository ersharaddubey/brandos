import { useState } from 'react';
import { Play } from 'lucide-react';

// Click-to-play YouTube card (loads only the thumbnail until clicked, so the page stays fast).
// Pass `playing` + `onPlay` to control it from outside (the slider plays one video at a time).
export default function YouTubePlayer({ id, playing, onPlay, className = '' }) {
  const [own, setOwn] = useState(false);
  const on = playing ?? own;
  const start = () => { if (onPlay) onPlay(); else setOwn(true); };
  return (
    <div className={`relative aspect-video overflow-hidden rounded-3xl bg-black shadow-lift ${className}`}>
      {on ? (
        <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <button onClick={start} className="group absolute inset-0 w-full" aria-label="Play video">
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          <span className="absolute inset-0 bg-black/30 transition group-hover:bg-black/15" />
          <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-500 text-white shadow-gold transition group-hover:scale-110"><Play size={30} className="ml-1" fill="currentColor" /></span>
        </button>
      )}
    </div>
  );
}
