import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@theme';

/** İlerleme halkası. value: 0–1. size: 24|48|96. children ortada gösterilir (ör. sayı). */
export function ProgressRing({
  value = 0,
  size = 48,
  strokeWidth,
  tone = 'accent',
  children,
  accessibilityLabel,
  style,
}) {
  const { colors } = useTheme();
  const sw = strokeWidth ?? (size >= 96 ? 8 : size >= 48 ? 5 : 3);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const fg = {
    accent: colors.accent.default,
    success: colors.success.fg,
    reward: colors.reward.default,
  }[tone];
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border.default}
          strokeWidth={sw}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fg}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * clamped} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}
