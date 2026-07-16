import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' as const, flag: '🇪🇬' },
  { code: 'en', label: 'English', dir: 'ltr' as const, flag: '🇺🇸' },
  { code: 'fr', label: 'Français', dir: 'ltr' as const, flag: '🇫🇷' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export function getLanguageDir(lang: string): 'rtl' | 'ltr' {
  return SUPPORTED_LANGUAGES.find(l => l.code === lang)?.dir ?? 'ltr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en', 'fr'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'auditry_lang',
    },
  });

i18n.on('languageChanged', (lng) => {
  const dir = getLanguageDir(lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
});

const initialDir = getLanguageDir(i18n.language);
document.documentElement.lang = i18n.language;
document.documentElement.dir = initialDir;

export default i18n;
