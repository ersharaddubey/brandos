import { useSettings } from '../SettingsContext';
import SmartImg from './SmartImg';

// Two-column card used by Login, Register and Find my booking
export default function AuthShell({ title, text, children, footer }) {
  const { settings: s } = useSettings();
  return (
    <div className="wrap pb-24 pt-36 md:pt-44">
      <div className="glass-strong mx-auto grid max-w-5xl rounded-3xl overflow-hidden md:grid-cols-2">
        <div className="relative hidden min-h-[520px] md:block">
          <SmartImg src={s.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/20" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="font-serif text-4xl leading-tight">{s.siteName}</p>
            <p className="mt-2 text-white/88">{s.tagline}</p>
          </div>
        </div>
        <div className="p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          {text && <p className="mt-3 text-ink/78">{text}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-ink/78">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
