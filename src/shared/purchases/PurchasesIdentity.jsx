import { useEffect } from 'react';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { report } from '@shared/monitoring/report';
import { identifyPurchases, purchasesEnabled, resetPurchases } from './purchases';

/** Oturum durumuna göre RevenueCat kullanıcısını eşler (giriş/kayıt → logIn, çıkış → logOut). Görünmez. */
export function PurchasesIdentity() {
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  const userId = useAuthStore((s) => s.user?.userAccountId ?? s.user?.id ?? null);
  useEffect(() => {
    if (!purchasesEnabled) return undefined;
    let alive = true;
    if (status === 'authenticated' && !isGuest) {
      api
        .identityAccountGet()
        .then((res) => unwrap(res)?.code)
        .then((code) => alive && code && identifyPurchases(code))
        .catch((err) => report(err, { where: 'purchases.identify' }));
    } else if (status === 'unauthenticated' || isGuest) {
      resetPurchases();
    }
    return () => {
      alive = false;
    };
  }, [status, isGuest, userId]);
  return null;
}
