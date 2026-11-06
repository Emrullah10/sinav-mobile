import { Redirect } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { SplashView } from '@components/SplashView';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { ensureSession } from '@shared/auth/session';
import { useAuthStore } from '@shared/auth/authStore';
import { deepLinks } from '@shared/navigation/deepLinks';
import { onboardingRoute } from '@shared/navigation/onboardingRoute';
import { useOnboardingStore } from '@store/onboardingStore';

// Açılış kapısı: ilk kez gelen karşılamaya; sonra oturum yoksa misafir oturumu açılır.
// Öğrenci -> Bugün; misafir -> kaldığı yerden onboarding.
export default function Index() {
  const welcomeSeen = useOnboardingStore((s) => s.welcomeSeen);
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  const sessionEndedCode = useAuthStore((s) => s.sessionEndedCode);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState(null);
  // AsyncStorage'dan gelen welcomeSeen yüklenmeden karar verilmez (aksi halde dönen kullanıcı karşılamaya düşebilir).
  const hydrated = useSyncExternalStore(
    (notify) => useOnboardingStore.persist.onFinishHydration(notify),
    () => useOnboardingStore.persist.hasHydrated(),
  );

  useEffect(() => {
    // Oturum sunucuca sonlandırıldıysa sessizce misafir açılmaz; "oturum bitti" ekranı gösterilir.
    if (!hydrated || !welcomeSeen || status === 'authenticated' || sessionEndedCode) return;
    ensureSession().catch(() => setFailed(true));
  }, [hydrated, welcomeSeen, status, sessionEndedCode]);

  useEffect(() => {
    if (status !== 'authenticated' || !isGuest) return undefined;
    let alive = true;
    api
      .learningEnrollmentActiveGet()
      .then((res) => alive && setTarget(onboardingRoute(unwrap(res)?.enrollment)))
      .catch(() => alive && setTarget(deepLinks.today)); // kayıt okunamadıysa yeni kayıt açtırma
    return () => {
      alive = false;
    };
  }, [status, isGuest]);

  if (!hydrated || sessionEndedCode) return <SplashView />;
  if (!welcomeSeen) return <Redirect href="/welcome" />;
  // Ağ yokken de kabuk açılır; istekler yeniden denendiğinde oturum kurulur.
  if (failed) return <Redirect href={deepLinks.today} />;
  if (status === 'authenticated') {
    if (!isGuest) return <Redirect href={deepLinks.today} />;
    if (target) return <Redirect href={target} />;
  }
  return <SplashView />;
}
