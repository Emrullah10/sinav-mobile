import { create } from 'zustand';
import { persisted } from './persist';

/** Kalıcı arayüz tercihleri (Ben › Ayarlar). */
export const useUiStore = create(
  persisted(
    'ui',
    (set) => ({
      hapticsEnabled: true,
      soundEnabled: false,
      language: null, // null = cihaz dili
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setLanguage: (language) => set({ language }),
    }),
    (s) => ({
      hapticsEnabled: s.hapticsEnabled,
      soundEnabled: s.soundEnabled,
      language: s.language,
    }),
  ),
);
