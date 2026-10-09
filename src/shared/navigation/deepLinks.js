import { router } from 'expo-router';
import { deepLinks } from '@shared/vendor/client-sdk/index.js';

export { deepLinks };

// deepLinks tek kaynaktan (web router'ı ve expo-router aynı liste): örnek yollardan kök segmentleri çıkar.
const sample = Object.values(deepLinks).map((v) => (typeof v === 'function' ? v('x') : v));
const ROOTS = new Set(sample.map((p) => p.split('/')[1]));

/** Bildirim / harici bağlantıdan gelen yol bilinen bir derin bağlantı mı? */
export const isDeepLinkPath = (path) =>
  typeof path === 'string' && path.startsWith('/') && ROOTS.has(path.split('/')[1]);

/** Bilinen bir derin bağlantıya gider; bilinmiyorsa Bugün'e düşer. Örn. openDeepLink(deepLinks.studyType('okuma')) */
export const openDeepLink = (path) => {
  router.push(isDeepLinkPath(path) ? path : deepLinks.today);
};
