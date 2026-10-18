import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useAuth } from '../AuthContext';
import { igUrl } from '../config';
import { instagramEmbed } from '../lib/parse';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

/**
 * Instagram Gallery page — shows Instagram reels/posts whose links are
 * managed in Admin → Home videos (instagramUrls). Profile handle comes
 * from Admin → Site settings → Contact.
 */
export default function InstagramGallery() {
  const { settings: s } = useSettings();
  const { user } = useAuth();
  const embeds = (s.instagramUrls || []).map(instagramEmbed).filter(Boolean);
  const handle = s.instagram ? String(s.instagram).replace(/^@/, '') : '';

  return (
    <>
      <PageHero
        eyebrow="Social"
        title="Instagram Gallery"
        text={handle ? `Moments we share on @${handle}. Open any post or follow us for more.` : 'Moments we share on Instagram.'}
      />

      <section className="wrap section-y">
        {embeds.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {embeds.map((src, i) => (
              <Reveal key={src} delay={i * 80}>
                <div className="overflow-hidden rounded-3xl glass-strong p-1.5 shadow-lift">
                  <iframe
                    src={src}
                    title={`Instagram post ${i + 1}`}
                    loading="lazy"
                    className="h-[560px] w-full border-0"
                    allowFullScreen
                  />
                </div>
              </Reveal>
            ))}
          </div>
        ) : user?.role === 'admin' ? (
          <div className="glass rounded-3xl border-2 border-dashed border-gold-500/60 p-10 text-center">
            <p className="eyebrow">Only you can see this</p>
            <h2 className="mt-3 text-3xl">Add Instagram links</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink/78">
              Paste Instagram reel or post links in Admin → Home videos. This page will show them for visitors once saved.
            </p>
            <Link to="/admin/videos" className="bt-dark mt-6">Add Instagram links</Link>
          </div>
        ) : (
          <p className="text-center text-ink/78">Instagram posts will appear here soon.</p>
        )}

        {handle && (
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <a href={igUrl(handle)} target="_blank" rel="noreferrer" className="bt-dark">
              <Instagram size={16} /> Follow @{handle}
            </a>
            <Link to="/gallery" className="bt-line">Photo gallery</Link>
          </div>
        )}
      </section>

      <CustomBlocks page="instagram-gallery" />
      <CtaBand />
    </>
  );
}
