import { RefreshCw, X } from 'lucide-react-native';
import { Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useAppUpdate } from './useAppUpdate';

/**
 * Yeni sürüm uyarısı: sunucunun bildirdiği en son mağaza derlemesi yüklü olandan yeniyse üstte şerit
 * ("Yeni sürüm var · Güncelle" → mağaza). "Sonra" denince aynı sürüm için 3 gün sorulmaz.
 */
export function UpdateBanner() {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { status, storeUrl, snoozeLatest } = useAppUpdate();
  if (status !== 'recommend') return null;
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
          onPress={() => Linking.openURL(storeUrl).catch(() => {})}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: pressed ? colors.accent.pressed : colors.accent.default })}
        >
          <RefreshCw size={16} color={colors.text['on-accent']} />
          <Text variant="label-m" style={{ color: colors.text['on-accent'] }}>{t('update.cta')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.later')}
          hitSlop={8}
          onPress={() => snoozeLatest()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}
        >
          <X size={18} color={colors.text.inverse} />
        </Pressable>
      </View>
    </View>
  );
}
