import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useUiStore } from '@store/uiStore';

/**
 * Dokunsal geri bildirim (tasarım §7.9). Kullanıcı tercihine (Ayarlar › Titreşim) saygı duyar.
 * Yanlış cevapta titreşim YOK — `wrong` bilerek tanımlı değil.
 */
export const useHaptics = () => {
  const enabled = useUiStore((s) => s.hapticsEnabled);
  return useMemo(() => {
    const run = (fn) => () => {
      if (enabled) fn().catch(() => {});
    };
    const android = Platform.OS === 'android';
    return {
      enabled,
      select: run(() => Haptics.selectionAsync()),
      tap: run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      soft: run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
      correct: run(() =>
        android
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      ),
      success: run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      warning: run(() =>
        android
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
      ),
    };
  }, [enabled]);
};
