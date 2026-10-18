import Reveal from './Reveal';

export default function SectionHeading({ eyebrow, title, text, align = 'center', light = false, children }) {
  const center = align === 'center';
  return (
    <Reveal className={`mb-12 md:mb-16 ${center ? 'mx-auto max-w-2xl text-center' : 'flex flex-wrap items-end justify-between gap-6'}`}>
      <div>
        {eyebrow && <p className={`eyebrow ${light ? '!text-gold-300' : ''}`}>{eyebrow}</p>}
        <h2 className={`mt-3 text-4xl leading-[1.05] md:text-5xl ${light ? 'text-white' : 'text-ink'}`}>{title}</h2>
        {text && <p className={`mt-4 text-[1.05rem] leading-relaxed ${light ? 'text-white/85' : 'text-ink/78'}`}>{text}</p>}
      </div>
      {children}
    </Reveal>
  );
}
