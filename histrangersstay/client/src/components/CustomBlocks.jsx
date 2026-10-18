import { useSettings } from '../SettingsContext';
import { parseBlocks } from '../lib/parse';
import Reveal from './Reveal';

// Extra content added in Admin > Site settings > Extra content blocks, shown on the chosen page
export default function CustomBlocks({ page }) {
  const { settings: s } = useSettings();
  const blocks = parseBlocks(s.customSections, page);
  if (!blocks.length) return null;
  return (
    <section className="wrap pb-20 md:pb-28">
      <div className="space-y-6">
        {blocks.map((b, i) => (
          <Reveal key={i} className="surface p-8 md:p-12">
            {b.title && <h2 className="text-3xl md:text-4xl">{b.title}</h2>}
            <div className="copy mt-4 max-w-3xl">{b.paras.map((t, j) => <p key={j}>{t}</p>)}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
