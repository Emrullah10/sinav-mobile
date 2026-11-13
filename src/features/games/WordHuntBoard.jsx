import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, useReducedMotion } from 'react-native-reanimated';
import { huntNeighbors } from '@shared/vendor/domain/index.js';
import { Text } from '@components';
import { useTheme } from '@theme';

// Sürükleme sırasındaki yol: React dışı küçük nesne (React Compiler render'da ref/değişken yazmayı sevmez).
const createDrag = () => {
  let path = [];
  return { get: () => path, set: (p) => { path = p; } };
};

const GAP = 8;
const PAD = 10;

/** Izgara: parmakla harflerin üzerinden sürükle. Bırakınca onSubmit(path). feedback: 'ok' | 'bad' | null. */
export function WordHuntBoard({ grid, size = 4, path, onPath, onSubmit, disabled, feedback }) {
  const { colors, radius } = useTheme();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const cell = Math.min(84, Math.floor((Math.min(width, 520) - 32 - PAD * 2 - GAP * (size - 1)) / size));
  const total = cell * size + GAP * (size - 1) + PAD * 2;
  // Sürükleme sırasındaki yol React dışı küçük bir nesnede tutulur (jest işleyicileri her çizimde yeniden kurulmaz).
  const [engine] = useState(createDrag);
  const shown = path;
  const shake = useSharedValue(0);
  useEffect(() => {
    if (feedback !== 'bad' || reduce) return;
    shake.value = withSequence(withTiming(-7, { duration: 50 }), withTiming(7, { duration: 80 }), withTiming(-5, { duration: 70 }), withTiming(0, { duration: 50 }));
  }, [feedback, reduce, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const cellAt = (x, y) => {
    const step = cell + GAP;
    const px = x - PAD;
    const py = y - PAD;
    if (px < 0 || py < 0) return -1;
    const c = Math.floor(px / step);
    const r = Math.floor(py / step);
    if (c >= size || r >= size) return -1;
    const fx = (px - c * step) / cell;
    const fy = (py - r * step) / cell;
    if (fx < 0.12 || fx > 0.88 || fy < 0.12 || fy > 0.88) return -1; // kenar bölgeleri: çapraz geçişte yanlış seçimi önler
    return r * size + c;
  };
  const extend = (i) => {
    if (i < 0) return;
    const p = engine.get();
    const last = p[p.length - 1];
    if (i === last) return;
    if (p.length > 1 && i === p[p.length - 2]) { engine.set(p.slice(0, -1)); onPath(engine.get()); return; }
    if (p.includes(i) || (last !== undefined && !huntNeighbors(last, size).includes(i))) return;
    engine.set([...p, i]);
    onPath(engine.get());
  };
  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .enabled(!disabled)
    .onBegin((e) => {
      const i = cellAt(e.x, e.y);
      if (i < 0) return;
      engine.set([i]);
      onPath([i]);
    })
    .onUpdate((e) => extend(cellAt(e.x, e.y)))
    .onEnd(() => {
      const p = engine.get();
      engine.set([]);
      if (p.length) onSubmit(p);
    });

  const tone = (i) => {
    if (!shown.includes(i)) return { bg: colors.bg.surface, border: colors.border.default, fg: colors.text.primary };
    const head = shown[shown.length - 1] === i;
    if (feedback === 'ok') return head ? { bg: colors.success.fg, border: colors.success.fg, fg: colors.bg.surface } : { bg: colors.success.bg, border: colors.success.fg, fg: colors.success.fg };
    if (feedback === 'bad') return { bg: colors.danger.bg, border: colors.danger.fg, fg: colors.danger.fg };
    return head ? { bg: colors.accent.default, border: colors.accent.default, fg: colors.text['on-accent'] } : { bg: colors.accent['subtle-bg'], border: colors.accent.default, fg: colors.accent['subtle-fg'] };
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLabel="Letter grid"
        style={[{ width: total, height: total, padding: PAD, borderRadius: radius.xl, backgroundColor: colors.bg.canvas, opacity: disabled ? 0.55 : 1, alignSelf: 'center' }, shakeStyle]}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {grid.map((ch, i) => {
            const tn = tone(i);
            return (
              <View
                key={i}
                accessible
                accessibilityLabel={ch.toUpperCase()}
                style={{
                  width: cell, height: cell, borderRadius: radius.lg, borderWidth: 2, borderColor: tn.border, backgroundColor: tn.bg,
                  alignItems: 'center', justifyContent: 'center', transform: [{ scale: shown.includes(i) ? 1.06 : 1 }],
                }}
              >
                <Text allowFontScaling={false} style={{ color: tn.fg, fontSize: cell * 0.46, lineHeight: cell * 0.58, fontWeight: '800', textTransform: 'uppercase' }}>{ch}</Text>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
