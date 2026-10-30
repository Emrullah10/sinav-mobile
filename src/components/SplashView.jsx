import { View } from 'react-native';
import { useTheme } from '@theme';
import i18n from '@shared/translation/i18n';
import { BrandMark } from './BrandMark';
import { BubbleLoader } from './BubbleLoader';
import { Text } from './Text';

/** Açılış / yükleme ekranı: marka işareti + adı + 5 baloncuk (yerel splash ile aynı işaret). */
export function SplashView() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 24,
      }}
    >
      <View style={{ alignItems: 'center', gap: 12 }}>
        <BrandMark size={88} />
        <Text variant="display-m" color="accent" accessibilityRole="header">
          {i18n.t('app.name')}
        </Text>
      </View>
      <BubbleLoader label={i18n.t('common.loading')} />
    </View>
  );
}
