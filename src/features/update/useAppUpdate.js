import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useUiStore } from '@store/uiStore';

// Yüklü derlemenin numarası (app.config: ios.buildNumber / android.versionCode).
const CURRENT = Number(Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode) || 0;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Sürüm durumu: 'force' (yüklü < minBuild; kapatılamaz), 'recommend' (yüklü < latestBuild; "Sonra" ile 3 gün susar), 'none'.
 * Ağ/sunucu hatasında 'none' (çevrimdışı kullanıcı kilitlenmez). Uygulamaya dönünce yeniden sorulur.
 */
export function useAppUpdate() {
  const [now] = useState(() => Date.now());
  const snooze = useUiStore((s) => s.updateSnooze);
  const setSnooze = useUiStore((s) => s.setUpdateSnooze);
  const q = useQuery({
    queryKey: ['identity', 'appVersion'],
    queryFn: async () => unwrap(await api.identityAppVersionGet()),
    staleTime: 60 * 60 * 1000,
    retry: false,
    meta: { silent: true },
  });
  const { refetch } = q;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const info = q.data?.[Platform.OS];
  let status = 'none';
  if (CURRENT && info?.storeUrl) {
    if (info.minBuild && CURRENT < info.minBuild) status = 'force';
    else if (info.latestBuild && CURRENT < info.latestBuild) {
      const snoozed = snooze?.build === info.latestBuild && now - (snooze.at || 0) < SNOOZE_MS;
      if (!snoozed) status = 'recommend';
    }
  }
  return { status, storeUrl: info?.storeUrl || null, snoozeLatest: () => info?.latestBuild && setSnooze({ build: info.latestBuild, at: Date.now() }) };
}
