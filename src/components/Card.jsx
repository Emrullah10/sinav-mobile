import { Pressable, View } from 'react-native';
import { useTheme } from '@theme';

/** Kart. elevation: 'e0' (varsayılan, kenarlıklı) | 'e1' (vurgulu). onPress verilirse tüm kart hedeftir. selected: accent kenar. */
export function Card({
  children,
  elevation = 'e0',
  onPress,
  selected = false,
  padded = true,
  accessibilityLabel,
  style,
  testID,
}) {
  const { elevation: elev, colors, radius, space } = useTheme();
  const base = [
    elev[elevation] || elev.e0,
    { borderRadius: radius.lg, padding: padded ? space[5] : 0 },
    selected
      ? { borderColor: colors.accent.default, borderWidth: 2, backgroundColor: colors.bg.selected }
      : null,
  ];
  if (!onPress) {
    return (
      <View testID={testID} style={[base, style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        pressed ? { backgroundColor: colors.bg.selected, transform: [{ scale: 0.98 }] } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
