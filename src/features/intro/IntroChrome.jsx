import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@theme';

/** Arka plandaki yumuşak lekeler: renkleri sayfayla birlikte geçiş yapar, yavaşça süzülür. */
export function IntroBackdrop({ scrollX, width, count, reduced }) {
  const { colors } = useTheme();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    drift.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [reduced, drift]);
  const stops = Array.from({ length: count }, (_, i) => i * width);
  const big = [
    colors.accent['subtle-bg'],
    colors.reward['subtle-bg'],
    colors.bg.selected,
    colors.success.bg,
  ];
  const small = [
    colors.reward['subtle-bg'],
    colors.accent['subtle-bg'],
    colors.reward['subtle-bg'],
    colors.accent['subtle-bg'],
  ];
  const pick = (list) => stops.map((_, i) => list[i % list.length]);
  const bigColors = pick(big);
  const smallColors = pick(small);
  const a = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollX.value, stops, bigColors),
    transform: [
      { translateX: interpolate(scrollX.value, [0, stops[stops.length - 1] || 1], [0, -60]) },
      { translateY: drift.value * 18 },
      { scale: 1 + drift.value * 0.06 },
    ],
  }));
  const b = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollX.value, stops, smallColors),
    transform: [
      { translateX: interpolate(scrollX.value, [0, stops[stops.length - 1] || 1], [0, 50]) },
      { translateY: -drift.value * 14 },
    ],
  }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: 160,
            top: -80,
            right: -120,
            opacity: 0.8,
          },
          a,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            top: 300,
            left: -110,
            opacity: 0.6,
          },
          b,
        ]}
      />
    </View>
  );
}

function Dot({ index, scrollX, width }) {
  const { colors } = useTheme();
  const s = useAnimatedStyle(() => {
    const pos = scrollX.value / width;
    return {
      width: interpolate(pos, [index - 1, index, index + 1], [8, 24, 8], 'clamp'),
      backgroundColor: interpolateColor(
        pos,
        [index - 1, index, index + 1],
        [colors.border.strong, colors.accent.default, colors.border.strong],
      ),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, s]} />;
}

/** Sayfa göstergesi: etkin nokta kaydırmayla birlikte uzar ve renklenir. */
export function IntroDots({ scrollX, width, count, accessibilityLabel }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
      }}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} width={width} />
      ))}
    </View>
  );
}

/**
 * Tek sayfa: görsel katman metinden daha yavaş kayar (parallax), uzaklaştıkça küçülüp söner.
 * Azaltılmış harekette yalnız saydamlık değişir.
 */
export function IntroSlide({
  index,
  scrollX,
  width,
  reduced,
  art,
  artFirst = true,
  align = 'center',
  children,
}) {
  const artStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * width) / width;
    const d = Math.abs(p);
    if (reduced) return { opacity: interpolate(d, [0, 1], [1, 0.2], 'clamp') };
    return {
      opacity: interpolate(d, [0, 0.8], [1, 0], 'clamp'),
      transform: [
        { translateX: p * width * 0.4 },
        { scale: interpolate(d, [0, 1], [1, 0.82], 'clamp') },
      ],
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * width) / width;
    const d = Math.abs(p);
    if (reduced) return { opacity: interpolate(d, [0, 1], [1, 0.2], 'clamp') };
    return {
      opacity: interpolate(d, [0, 0.6], [1, 0], 'clamp'),
      transform: [{ translateX: p * width * 0.18 }],
    };
  });
  const artNode = art ? (
    <Animated.View style={[{ alignItems: align }, artStyle]}>{art}</Animated.View>
  ) : null;
  const textNode = children ? (
    <Animated.View style={[{ gap: 12 }, textStyle]}>{children}</Animated.View>
  ) : null;
  return (
    <View style={{ gap: 18 }}>
      {artFirst ? artNode : textNode}
      {artFirst ? textNode : artNode}
    </View>
  );
}
