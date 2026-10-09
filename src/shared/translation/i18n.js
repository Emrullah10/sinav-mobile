import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { keys as vendorKeys } from '@shared/vendor/i18n/index.js';
import appKeys from './appKeys';

export const SUPPORTED = ['tr', 'en'];
const merged = { ...vendorKeys, ...appKeys };
const pick = (lang) =>
  Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v[lang] ?? v.tr]));
export const resources = { tr: { translation: pick('tr') }, en: { translation: pick('en') } };

/** Cihaz dili desteklenenlerdeyse o; değilse Türkçe. */
export const detectLanguage = () => {
  const code = getLocales()?.[0]?.languageCode;
  return SUPPORTED.includes(code) ? code : 'tr';
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'tr',
    keySeparator: false, // anahtarlar düz ('apiErrors.TOKEN_EXPIRED')
    interpolation: { escapeValue: false },
    initAsync: false,
    returnNull: false,
  });
}

export default i18n;
