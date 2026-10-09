import { Pressable } from 'react-native';
import { useHaptics } from '@hooks/useHaptics';
import { useTheme } from '@theme';

/**
 * İkon düğmesi. icon: lucide bileşeni. accessibilityLabel ZORUNLU.
 * variant: standard|tonal|outlined · size: 44|36|32 (36/32'de dokunma alanı hitSlop ile 44'e tamamlanır).
 */
export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'standard',
  size = 44,
  disabled = false,
  color,
  style,
  testID,
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const pad = Math.max(0, (44 - size) / 2);
  const bg = variant === 'tonal' ? colors.accent['subtle-bg'] : 'transparent';
  const fg = disabled
    ? colors.text.disabled
    : color || (variant === 'tonal' ? colors.accent['subtle-fg'] : colors.text.primary);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: pad, bottom: pad, left: pad, right: pad }}
      onPress={(e) => {
        haptics.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.bg.pressed : bg,
          borderWidth: variant === 'outlined' ? 1.5 : 0,
          borderColor: colors.border.strong,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={size >= 44 ? 24 : 20} color={fg} strokeWidth={1.75} /> : null}
    </Pressable>
  );
}
