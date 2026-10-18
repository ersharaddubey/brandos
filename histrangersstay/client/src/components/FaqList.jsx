import { ChevronDown } from 'lucide-react';

export default function FaqList({ faqs }) {
  return (
    <div className="space-y-3">
      {faqs.map((f) => (
        <details key={f.q} className="group glass rounded-2xl px-6 open:shadow-glass-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-serif text-xl [&::-webkit-details-marker]:hidden">
            {f.q}<ChevronDown size={20} className="shrink-0 text-gold-700 transition group-open:rotate-180" />
          </summary>
          <p className="pb-6 leading-relaxed text-ink/80">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
