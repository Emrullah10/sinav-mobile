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
      shakeToFeedback: true, // telefonu sallayınca geri bildirim (ekran görüntüsüyle)
      translationLevel: 'medium', // çeviri koçu seviyesi: easy | medium | hard (son seçim)
      setShakeToFeedback: (shakeToFeedback) => set({ shakeToFeedback }),
      setLexiconTipSeen: (lexiconTipSeen) => set({ lexiconTipSeen }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setLanguage: (language) => set({ language }),
      setTranslationLevel: (translationLevel) => set({ translationLevel }),
    }),
    (s) => ({
      hapticsEnabled: s.hapticsEnabled,
      soundEnabled: s.soundEnabled,
      language: s.language,
      lexiconTipSeen: s.lexiconTipSeen,
      shakeToFeedback: s.shakeToFeedback,
      translationLevel: s.translationLevel,
    }),
  ),
);
