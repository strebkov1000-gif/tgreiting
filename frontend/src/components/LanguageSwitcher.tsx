import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const isRussian = language === 'ru';

  return (
    <button
      onClick={() => setLanguage(isRussian ? 'en' : 'ru')}
      className="flex items-center gap-0.5 px-1 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200"
    >
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all ${
        !isRussian
          ? 'bg-cyan-500 text-white'
          : 'text-cyan-500/60'
      }`}>
        EN
      </span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all ${
        isRussian
          ? 'bg-cyan-500 text-white'
          : 'text-cyan-500/60'
      }`}>
        RU
      </span>
    </button>
  );
}
