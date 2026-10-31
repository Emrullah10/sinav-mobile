import { router, usePathname } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { AppState, Dimensions } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import { useHaptics } from '@hooks/useHaptics';
import { useAuthStore } from '@shared/auth/authStore';
import { report } from '@shared/monitoring/report';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useUiStore } from '@store/uiStore';
import { useFeedbackStore } from './feedbackStore';
import { compressImage } from './media';

const THRESHOLD_G = 2.2; // telefonun bilinçli sallanması (yürürken ~1.3 g)
const HITS = 3;
const WINDOW_MS = 900;
const COOLDOWN_MS = 4000;

/**
 * Sallayınca geri bildirim: o anki ekranın görüntüsünü alıp geri bildirim ekranını açar.
 * Oturum açmış (misafir dahil) ve ayarı açık kullanıcıda, yalnız uygulama ön plandayken dinler.
 */
export function ShakeToFeedback() {
  const enabled = useUiStore((s) => s.shakeToFeedback);
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const pathname = usePathname();
  const haptics = useHaptics();
  const where = useRef(pathname);
  useEffect(() => {
    where.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabled || !authed) return undefined;
    let sub = null;
    let hits = [];
    let last = 0;
    let busy = false;
    const onShake = async () => {
      if (busy || where.current === deepLinks.feedback) return;
      busy = true;
      haptics.tap();
      let image = null;
      try {
        const uri = await captureScreen({ format: 'jpg', quality: 0.8, result: 'tmpfile' });
        const { width, height, scale } = Dimensions.get('screen');
        image = await compressImage({ uri, width: Math.round(width * scale), height: Math.round(height * scale) });
      } catch (e) {
        report(e); // görüntüsüz de açılır
      }
      useFeedbackStore.getState().setPending({ image, screen: where.current });
      router.push(deepLinks.feedback);
      busy = false;
    };
    const start = () => {
      if (sub) return;
      Accelerometer.setUpdateInterval(100);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        if (Math.sqrt(x * x + y * y + z * z) < THRESHOLD_G) return;
        const now = Date.now();
        if (now - last < COOLDOWN_MS) return;
        hits = [...hits.filter((t) => now - t < WINDOW_MS), now];
        if (hits.length >= HITS) {
          hits = [];
          last = now;
          onShake();
        }
      });
    };
    const stop = () => {
      sub?.remove();
      sub = null;
    };
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      appSub.remove();
      stop();
    };
  }, [enabled, authed, haptics]);

  return null;
}
