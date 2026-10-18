import { MessageCircle } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { waUrl } from '../config';

export default function WhatsAppFab() {
  const { settings } = useSettings();
  if (!settings.whatsapp) return null;
  return (
    <a href={waUrl(settings.whatsapp)} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
      className="group fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-medium text-white shadow-lift transition hover:-translate-y-1 md:flex">
      <MessageCircle size={20} /><span>Chat with us</span>
    </a>
  );
}
