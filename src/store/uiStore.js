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
      lexiconTipSeen: false, // dokun-çevir ipucu bir kez gösterilir
      setLexiconTipSeen: (lexiconTipSeen) => set({ lexiconTipSeen }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setLanguage: (language) => set({ language }),
    }),
    (s) => ({
      hapticsEnabled: s.hapticsEnabled,
      soundEnabled: s.soundEnabled,
      language: s.language,
      lexiconTipSeen: s.lexiconTipSeen,
    }),
  ),
);
