import { Link } from 'react-router-dom';
import { Youtube } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useAuth } from '../AuthContext';
import { ytUrl } from '../config';
import { youtubeId } from '../lib/parse';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import YouTubePlayer from '../components/YouTubePlayer';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

// YouTube videos added in Admin > Home videos
export default function YouTubeGallery() {
  const { settings: s } = useSettings();
  const { user } = useAuth();
  const ids = (s.youtubeUrls || []).map(youtubeId).filter(Boolean);

  return (
    <>
      <PageHero eyebrow="Social" title="YouTube Gallery" text="Walk-throughs, mountain views and life at the stay. Tap a video to play it." />

      <section className="wrap section-y">
        {ids.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {ids.map((id, i) => (
              <Reveal key={id} delay={(i % 3) * 80}><YouTubePlayer id={id} /></Reveal>
            ))}
          </div>
        ) : user?.role === 'admin' ? (
          <div className="glass rounded-3xl border-2 border-dashed border-gold-500/60 p-10 text-center">
            <p className="eyebrow">Only you can see this</p>
            <h2 className="mt-3 text-3xl">Add YouTube links</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink/78">Paste YouTube links in Admin → Home videos. This page shows them to visitors once saved.</p>
            <Link to="/admin/videos" className="bt-dark mt-6">Add YouTube links</Link>
          </div>
        ) : (
          <p className="text-center text-ink/78">Videos will appear here soon.</p>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          {s.youtube && <a href={ytUrl(s.youtube)} target="_blank" rel="noreferrer" className="bt-dark"><Youtube size={16} /> Visit our channel</a>}
          <Link to="/gallery" className="bt-line">Photo gallery</Link>
        </div>
      </section>

      <CustomBlocks page="youtube-gallery" />
      <CtaBand />
    </>
  );
}
