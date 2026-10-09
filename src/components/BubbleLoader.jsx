import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@theme';
import { Text } from './Text';

function Bubble({ index, count, size, reduced }) {
  const { colors } = useTheme();
  const fill = useSharedValue(reduced ? (index < 3 ? 1 : 0) : 0);
  useEffect(() => {
    if (reduced) return undefined;
    // Beş baloncuk sırayla dolar, sonra birlikte boşalır (tasarım §7.8 Yükleme).
    const step = 140;
    fill.value = withDelay(
      index * step,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200, easing: Easing.bezier(0.2, 0, 0, 1) }),
          withTiming(1, { duration: (count - index - 1) * step + 300 }), // tut
          withTiming(0, { duration: 200 }),
          withTiming(0, { duration: index * step + 100 }), // dinlen (toplam süre tüm baloncuklarda eşit)
        ),
        -1,
      ),
    );
    return () => cancelAnimation(fill);
  }, [reduced, index, count, fill]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: fill.value > 0.5 ? colors.accent.default : 'transparent',
    transform: [{ scale: 0.85 + fill.value * 0.15 }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: colors.accent.default,
        },
        style,
      ]}
    />
  );
}

/** 5 baloncuğun sırayla dolması. Hareket azaltmada durağan. label: ekran okuyucu ve görünür yazı (isteğe bağlı). */
export function BubbleLoader({ count = 5, size = 14, label, showLabel = false }) {
  const reduced = useReducedMotion();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ alignItems: 'center', gap: 12 }}
    >
      <View style={{ flexDirection: 'row', gap: size * 0.6 }}>
        {Array.from({ length: count }, (_, i) => (
          <Bubble key={i} index={i} count={count} size={size} reduced={reduced} />
        ))}
      </View>
      {showLabel && label ? (
        <Text variant="body-s" color="secondary">
          {label}
        </Text>
      ) : null}
    </View>
  );
}
