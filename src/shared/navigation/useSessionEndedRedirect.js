import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@shared/auth/authStore';

/** Oturum bittiğinde (SESSION_ENDED_CODES / yenileme başarısız) SYS-07 sayfasına gider. */
export const useSessionEndedRedirect = () => {
  const code = useAuthStore((s) => s.sessionEndedCode);
  useEffect(() => {
    if (code) router.replace('/oturum-bitti');
  }, [code]);
};
