import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useBackgroundStore } from '@store/backgroundStore';

/** Girişte sunucudaki arka plan tercihini uygular (başka cihazda seçilen desen bu cihaza da gelsin). Görsel çıktısı yok. */
export function PreferencesSync() {
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const isGuest = useAuthStore((s) => s.isGuest);
  const prefs = useQuery({
    queryKey: queryKeys.account.prefs(),
    enabled: authed && !isGuest,
    queryFn: async () => unwrap(await api.identityPreferencesGet()),
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (prefs.data) useBackgroundStore.getState().apply(prefs.data);
  }, [prefs.data]);
  return null;
}
