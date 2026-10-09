import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@theme';

/**
 * İlerleme çubuğu. value: 0–1. height: 8 (varsayılan) | 4. tone: accent|success|reward.
 * segments: n verilirse bölümlü (ör. segments=10, value=0.7 → 7/10). indeterminate: belirsiz.
 */
export function ProgressBar({
  value = 0,
  height = 8,
  tone = 'accent',
  segments,
  indeterminate = false,
  accessibilityLabel,
  style,
}) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  const fg = {
    accent: colors.accent.default,
    success: colors.success.fg,
    reward: colors.reward.default,
  }[tone];
  const clamped = Math.max(0, Math.min(1, value));
  const x = useSharedValue(0);
  useEffect(() => {
    if (!indeterminate || reduced) return undefined;
    x.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
    return () => cancelAnimation(x);
  }, [indeterminate, reduced, x]);
  const sweep = useAnimatedStyle(() => ({ left: `${x.value * 100 - 30}%` }));

  if (segments) {
    const filled = Math.round(clamped * segments);
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: segments, now: filled }}
        style={[{ flexDirection: 'row', gap: 3 }, style]}
      >
        {Array.from({ length: segments }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height,
              borderRadius: radius.full,
              backgroundColor: i < filled ? fg : colors.border.default,
            }}
          />
        ))}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        indeterminate ? undefined : { min: 0, max: 100, now: Math.round(clamped * 100) }
      }
      style={[
        {
          height,
          borderRadius: radius.full,
          backgroundColor: colors.border.default,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {indeterminate ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: reduced ? '40%' : '30%',
              borderRadius: radius.full,
              backgroundColor: fg,
            },
            reduced ? { left: '30%' } : sweep,
          ]}
        />
      ) : (
        <View
          style={{
            width: `${clamped * 100}%`,
            height: '100%',
            borderRadius: radius.full,
            backgroundColor: fg,
          }}
        />
      )}
    </View>
  );
}
