import { View } from 'react-native';
import { useTheme } from '@theme';

/** Renkli ikon kutucuğu: ton (teal|indigo|amber|plum) design-tokens tint.* renklerinden; done → başarı rengi. */
export function IconTile({ icon: Icon, hue = 'teal', size = 40, done = false, muted = false }) {
  const { colors, radius } = useTheme();
  const fg = done ? colors.success.fg : colors.tint[hue];
  const bg = done ? colors.success.bg : colors.tint[`${hue}-bg`];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size <= 32 ? 10 : radius.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: muted ? 0.55 : 1,
      }}
    >
      <Icon size={Math.round(size * 0.5)} color={fg} strokeWidth={2} />
    </View>
  );
}
