import { useEffect, useRef } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/** Tanıtımın ortak hareket dili: yumuşak çıkış eğrisi, kısa süreler (tasarım tokenları: base 200, slow 400). */
export const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/**
 * Sayfa ilk kez görününce 0→1 giden değer (bir kez oynar; geri dönünce tekrar oynamaz, titreme olmaz).
 * Azaltılmış harekette baştan 1.
 */
export function useEntrance(active, reduced, delay = 0, duration = 420) {
  const v = useSharedValue(reduced ? 1 : 0);
  const played = useRef(false);
  useEffect(() => {
    if (reduced) {
      v.value = 1;
      return;
    }
    if (!active || played.current) return;
    played.current = true;
    v.value = withDelay(delay, withTiming(1, { duration, easing: EASE_OUT }));
  }, [active, reduced, delay, duration, v]);
  return v;
}

/** Aşağıdan süzülerek gelen öğe stili (opacity + translateY). */
export function useFadeUp(v, distance = 14) {
  return useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * distance }],
  }));
}
