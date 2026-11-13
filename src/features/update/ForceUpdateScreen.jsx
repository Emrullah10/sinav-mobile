import { RefreshCw } from 'lucide-react-native';
import { useEffect } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useAppUpdate } from './useAppUpdate';

/** Zorunlu güncelleme: yüklü derleme sunucunun minBuild değerinden eskiyse tüm ekranı örter; kapatılamaz, yalnız mağazaya götürür. */
export function ForceUpdateScreen() {
  const { status, storeUrl } = useAppUpdate();
  const { t } = useT();
  const { colors, radius } = useTheme();
  const force = status === 'force';
  useEffect(() => {
    if (!force) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [force]);
  if (!force) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: colors.bg.canvas, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]} accessibilityViewIsModal>
      <RefreshCw size={48} color={colors.accent.default} />
      <Text variant="heading-l" style={{ textAlign: 'center' }}>{t('update.force.title')}</Text>
      <Text variant="body-m" style={{ textAlign: 'center', opacity: 0.8 }}>{t('update.force.body')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('update.cta')}
        onPress={() => Linking.openURL(storeUrl).catch(() => {})}
        style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: pressed ? colors.accent.pressed : colors.accent.default })}
      >
        <Text variant="label-m" style={{ color: colors.text['on-accent'] }}>{t('update.cta')}</Text>
      </Pressable>
    </View>
  );
}
