import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
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
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!welcomeSeen || status === 'authenticated') return;
    ensureSession().catch(() => setFailed(true));
  }, [welcomeSeen, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !isGuest) return undefined;
    let alive = true;
    api
      .learningEnrollmentActiveGet()
      .then((res) => alive && setTarget(onboardingRoute(unwrap(res)?.enrollment)))
      .catch(() => alive && setTarget('/baslangic'));
    return () => {
      alive = false;
    };
  }, [status, isGuest]);

  if (!welcomeSeen) return <Redirect href="/karsilama" />;
  // Ağ yokken de kabuk açılır; istekler yeniden denendiğinde oturum kurulur.
  if (failed) return <Redirect href={deepLinks.today} />;
  if (status === 'authenticated') {
    if (!isGuest) return <Redirect href={deepLinks.today} />;
    if (target) return <Redirect href={target} />;
  }
  return <SplashView />;
}
