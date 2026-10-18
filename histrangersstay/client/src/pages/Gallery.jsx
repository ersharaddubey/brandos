import { useSettings } from '../SettingsContext';
import { useProperty } from '../PropertyContext';
import { parseGallery } from '../lib/parse';
import useGallery from '../lib/useGallery';
import PageHero from '../components/PageHero';
import GalleryGrid from '../components/Gallery';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

export default function GalleryPage() {
  const { settings: s } = useSettings();
  const { hotel, rooms } = useProperty();
  const { tiles, loading } = useGallery();

  // Until photos are added in Admin > Gallery, show the property and room photos
  const fallback = [
    ...parseGallery(s.gallery),
    ...(hotel?.images || []).map((src) => ({ src, caption: hotel.name })),
    ...rooms.flatMap((r) => (r.images || []).map((src) => ({ src, caption: r.name }))),
  ].filter((p, i, a) => a.findIndex((x) => x.src === p.src) === i);
  const items = tiles.length ? tiles : fallback;

  return (
    <>
      <PageHero eyebrow="Gallery" title="Moments from the stay" text="Rooms, views and the little things that make it home." />
      <section className="mx-auto w-full max-w-[1800px] px-3 py-14 sm:px-6 md:py-20 lg:px-10">
        {loading && !items.length
          ? <div className="grid auto-rows-[160px] grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className={`glass animate-pulse !rounded-2xl ${i === 0 ? 'col-span-2 row-span-2' : ''}`} />)}</div>
          : items.length
            ? <GalleryGrid items={items} variant="mixed" />
            : <p className="text-center text-ink/78">Photos will appear once added in Admin → Gallery.</p>}
      </section>
      <CustomBlocks page="gallery" />
      <CtaBand />
    </>
  );
}
