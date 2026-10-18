import { Link } from 'react-router-dom';
import { useSettings } from '../SettingsContext';
import { useAuth } from '../AuthContext';
import { youtubeId, instagramEmbed } from '../lib/parse';
import { YouTubeSlider, InstagramSlider } from './MediaSliders';

// Home page: one slider for YouTube and a separate one for Instagram.
// Links are set in Admin > Home videos. A section only shows when it has at least one valid link.
export default function VideoSection() {
  const { settings: s } = useSettings();
  const { user } = useAuth();
  const hasYt = (s.youtubeUrls || []).some((u) => youtubeId(u));
  const hasIg = (s.instagramUrls || []).some((u) => instagramEmbed(u));

  if (!hasYt && !hasIg) {
    if (user?.role !== 'admin') return null;
    return (
      <section id="video" className="wrap section-y">
        <div className="glass rounded-3xl border-2 border-dashed border-gold-500/60 p-10 text-center">
          <p className="eyebrow">Only you can see this</p>
          <h2 className="mt-3 text-3xl">Add a YouTube or Instagram video here</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/78">Paste the links in Admin → Home videos. YouTube and Instagram each get their own slider.</p>
          <Link to="/admin/videos" className="bt-dark mt-6">Add video links</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <YouTubeSlider id="video" />
      <InstagramSlider id={hasYt ? 'instagram' : 'video'} />
    </>
  );
}
