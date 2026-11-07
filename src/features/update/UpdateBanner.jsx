import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

// Yüklü derlemenin numarası (app.config: ios.buildNumber / android.versionCode).
const CURRENT = Number(Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode) || 0;

/**
 * Yeni sürüm uyarısı: sunucunun bildirdiği en son mağaza derlemesi yüklü olandan yeniyse üstte şerit
 * ("Yeni sürüm var · Güncelle" → mağaza). Kapatılırsa bu açılışta bir daha gösterilmez; uygulamaya dönünce yeniden bakılır.
 */
export function UpdateBanner() {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
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
  if (hidden || !CURRENT || !info?.latestBuild || info.latestBuild <= CURRENT || !info.storeUrl) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', zIndex: 50, top: insets.top + 8, left: 12, right: 12, alignItems: 'center' }}>
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          maxWidth: 520,
          width: '100%',
          paddingLeft: 14,
          paddingRight: 6,
          paddingVertical: 6,
          borderRadius: radius.full,
          backgroundColor: colors.bg.inverse,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="label-m" style={{ color: colors.text.inverse }}>{t('update.title')}</Text>
          <Text variant="caption" style={{ color: colors.text.inverse, opacity: 0.8 }} numberOfLines={1}>{t('update.body')}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.cta')}
          onPress={() => Linking.openURL(info.storeUrl).catch(() => {})}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: pressed ? colors.accent.pressed : colors.accent.default })}
        >
          <RefreshCw size={16} color={colors.text['on-accent']} />
          <Text variant="label-m" style={{ color: colors.text['on-accent'] }}>{t('update.cta')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.later')}
          hitSlop={8}
          onPress={() => setHidden(true)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}
        >
          <X size={18} color={colors.text.inverse} />
        </Pressable>
      </View>
    </View>
  );
}
