// Simple page heading used by the new pages (Cafe, Check-in, Locations, Leadership, Volunteer).
export default function PageTop({ eyebrow, title, text }) {
  return (
    <div className="wrap max-w-3xl pb-10 pt-40 text-center">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-3 text-5xl md:text-6xl">{title}</h1>
      {text && <p className="mx-auto mt-4 max-w-2xl text-ink/78">{text}</p>}
    </div>
  );
}
