import { View } from 'react-native';
import { useTheme } from '@theme';
import { Text } from './Text';

/** Rozet. dot: 8 pt nokta; aksi halde sayı (16 pt), max üzeri "99+". tone: accent|danger|neutral. count 0 ise çizilmez. */
export function Badge({ count, dot = false, max = 99, tone = 'danger', style }) {
  const { colors } = useTheme();
  const bg = {
    accent: colors.accent.default,
    danger: colors.danger.fg,
    neutral: colors.text.tertiary,
  }[tone];
  if (dot)
    return (
      <View
        accessibilityLabel="•"
        style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: bg }, style]}
      />
    );
  if (!count) return null;
  const label = count > max ? `${max}+` : String(count);
  return (
    <View
      style={[
        {
          minWidth: 16,
          height: 16,
          paddingHorizontal: 4,
          borderRadius: 8,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        variant="label-s"
        allowFontScaling={false}
        style={{ color: colors.bg.surface, fontSize: 11, lineHeight: 14 }}
      >
        {label}
      </Text>
    </View>
  );
}
