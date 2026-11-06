import { api } from '@api';
import { authState } from '@shared/auth/authStore';
import { useUiStore } from '@store/uiStore';
import i18n, { detectLanguage } from './i18n';

export const LANGUAGE_OPTIONS = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];
/** Kısa etiketli (TR | EN) sürüm: dar yerler için (karşılama); ekran okuyucu tam adı okur. */
export const LANGUAGE_OPTIONS_SHORT = LANGUAGE_OPTIONS.map((o) => ({
  value: o.value,
  label: o.value.toUpperCase(),
  accessibilityLabel: o.label,
}));

/**
 * Dil seçimi (null = cihaz dili): kalıcı tercih + arayüz. Oturum varsa hesabın dili de güncellenir
 * (e-posta ve bildirimler o dille gider); misafir hesabı ilk açılışta seçili dille açılır (ensureSession).
 */
export const chooseLanguage = (choice) => {
  useUiStore.getState().setLanguage(choice);
  const lng = choice || detectLanguage();
  if (i18n.language !== lng) i18n.changeLanguage(lng);
  if (authState().status === 'authenticated')
    api.identityAccountUpdate({ locale: lng }).catch(() => {}); // en iyi çaba
};
