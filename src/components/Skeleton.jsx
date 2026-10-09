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

/** İskelet. variant: rect (varsayılan) | text | circle. lines>1 ise metin satırları. Hareket azaltmada durağan. */
export function Skeleton({ width = '100%', height, variant = 'rect', lines = 1, style }) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduced) return undefined;
    o.value = withRepeat(withTiming(0.5, { duration: 800 }), -1, true);
    return () => cancelAnimation(o);
  }, [reduced, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  const h = height ?? (variant === 'text' ? 14 : variant === 'circle' ? 40 : 80);
  const shape =
    variant === 'circle'
      ? { width: height ?? 40, height: height ?? 40, borderRadius: 999 }
      : { width, height: h, borderRadius: variant === 'text' ? radius.xs : radius.md };
  const bar = (key, extra) => (
    <Animated.View
      key={key}
      style={[{ backgroundColor: colors.border.default }, shape, extra, anim]}
    />
  );
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      {lines > 1 ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: lines }, (_, i) =>
            bar(i, i === lines - 1 ? { width: '60%' } : null),
          )}
        </View>
      ) : (
        bar('b')
      )}
    </View>
  );
}
