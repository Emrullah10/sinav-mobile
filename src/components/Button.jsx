import { ActivityIndicator, Pressable, View } from 'react-native';
import { useHaptics } from '@hooks/useHaptics';
import { useTheme } from '@theme';
import { Text } from './Text';

const SIZES = {
  lg: { height: 52, variant: 'label-l', px: 20, icon: 20 },
  md: { height: 44, variant: 'label-m', px: 16, icon: 18 },
  sm: { height: 36, variant: 'label-m', px: 12, icon: 16 },
};

/**
 * Düğme. variant: primary|secondary|tertiary|destructive · size: lg(52)|md(44)|sm(36; dokunma alanı 44'e hitSlop ile tamamlanır).
 * loading: etiket yerinde gösterge, genişlik sabit, basma yok. fullWidth varsayılanı yalnız lg için true.
 * leftIcon/rightIcon: lucide bileşeni (ör. ArrowRight).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  accessibilityLabel,
  haptic = true,
  style,
  testID,
}) {
  const { colors, radius } = useTheme();
  const haptics = useHaptics();
  const s = SIZES[size] || SIZES.lg;
  const inactive = disabled || loading;
  const palette = {
    primary: {
      bg: colors.accent.default,
      pressed: colors.accent.pressed,
      fg: colors.text['on-accent'],
      border: 'transparent',
    },
    secondary: {
      bg: 'transparent',
      pressed: colors.bg.pressed,
      fg: colors.accent.default,
      border: colors.accent.default,
    },
    tertiary: {
      bg: 'transparent',
      pressed: colors.bg.pressed,
      fg: colors.accent.default,
      border: 'transparent',
    },
    destructive: {
      bg: colors.danger.fg,
      pressed: colors.danger.fg,
      fg: colors.bg.surface,
      border: 'transparent',
    },
  }[variant];
  // Pasif: opaklık yerine text.disabled + canvas dolgu (tasarım §8.1).
  const disabledPalette = {
    bg: variant === 'tertiary' ? 'transparent' : colors.bg.canvas,
    fg: colors.text.disabled,
    border: variant === 'secondary' ? colors.border.default : 'transparent',
  };
  const p = disabled ? disabledPalette : palette;
  const stretch = fullWidth ?? size === 'lg';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'sm' ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined}
      onPress={(e) => {
        if (haptic) haptics.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          minHeight: s.height,
          paddingHorizontal: s.px,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: p.border,
          backgroundColor: pressed && !inactive ? palette.pressed : p.bg,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: stretch ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: loading ? 0 : 1,
        }}
      >
        {LeftIcon ? <LeftIcon size={s.icon} color={p.fg} strokeWidth={1.75} /> : null}
        <Text variant={s.variant} style={{ color: p.fg, textAlign: 'center', flexShrink: 1 }}>
          {title}
        </Text>
        {RightIcon ? <RightIcon size={s.icon} color={p.fg} strokeWidth={1.75} /> : null}
      </View>
      {loading ? (
        <View style={{ position: 'absolute' }}>
          <ActivityIndicator color={p.fg} />
        </View>
      ) : null}
    </Pressable>
  );
}
