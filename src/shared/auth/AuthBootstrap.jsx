import { useEffect } from 'react';
import { SplashView } from '@components/SplashView';
import { bootstrapSession } from './session';
import { useAuthStore } from './authStore';

/** Açılışta oturumu sürdürür; sonuç gelene kadar BubbleLoader'lı yükleme ekranı gösterir. */
export function AuthBootstrap({ children }) {
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    bootstrapSession();
  }, []);
  if (status === 'unknown') return <SplashView />;
  return children;
}
