import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, useReducedMotion, Easing,
} from 'react-native-reanimated';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Text } from '@components';

const GAP = 6;
const FLIP_MS = 240;
const STAGGER = 140;

/** Tek harf kutusu. state: null (boş/yazılıyor) | correct | present | absent. reveal: bu kutu şimdi çevrilerek açılıyor. */
function Tile({ letter, state, reveal, index, size, label, win }) {
  const { colors, radius } = useTheme();
  const reduce = useReducedMotion();
  const rot = useSharedValue(0);
  const pop = useSharedValue(1);
  const hop = useSharedValue(0);
  // Çevirme ortasında renk değişir: reveal sırasında önce eski görünüm, FLIP_MS sonra yeni durum.
  const [flipped, setFlipped] = useState(false); // çevirme ortasına gelindi → yeni renk görünür
  const shown = reveal && !reduce && !flipped ? null : state;
  const prevLetter = useRef(letter);

  useEffect(() => {
    if (!reveal || reduce) return undefined;
    const delay = index * STAGGER;
    rot.value = withDelay(delay, withSequence(withTiming(90, { duration: FLIP_MS, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: FLIP_MS, easing: Easing.out(Easing.quad) })));
    const id = setTimeout(() => setFlipped(true), delay + FLIP_MS);
    return () => clearTimeout(id);
  }, [reveal, reduce, index, rot]);

  useEffect(() => {
    if (!state && letter && letter !== prevLetter.current && !reduce) {
      pop.value = withSequence(withTiming(1.1, { duration: 80 }), withTiming(1, { duration: 80 }));
    }
    prevLetter.current = letter;
  }, [letter, state, reduce, pop]);

  useEffect(() => {
    if (win && !reduce) hop.value = withDelay(index * 90 + 700, withSequence(withTiming(-12, { duration: 160 }), withTiming(2, { duration: 140 }), withTiming(0, { duration: 120 })));
  }, [win, reduce, index, hop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateX: `${rot.value}deg` }, { scale: pop.value }, { translateY: hop.value }],
  }));

  // Renk tek başına anlam taşımaz: doğru = dolu, yeri yanlış = kesikli + açık dolgu, yok = sönük.
  const pal = {
    correct: { bg: colors.success.fg, border: colors.success.fg, fg: colors.bg.surface, dashed: false },
    present: { bg: colors.warning.bg, border: colors.warning.fg, fg: colors.warning.fg, dashed: true },
    absent: { bg: colors.border.default, border: colors.border.default, fg: colors.text.secondary, dashed: false },
  }[shown] || { bg: colors.bg.surface, border: letter ? colors.border.strong : colors.border.default, fg: colors.text.primary, dashed: false };

  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      style={[{
        width: size, height: size, borderRadius: radius.md, borderWidth: 2, borderStyle: pal.dashed ? 'dashed' : 'solid',
        borderColor: pal.border, backgroundColor: pal.bg, alignItems: 'center', justifyContent: 'center',
      }, style]}
    >
      <Text allowFontScaling={false} style={{ color: pal.fg, fontSize: size * 0.5, lineHeight: size * 0.62, fontWeight: '800', textTransform: 'uppercase' }}>{letter}</Text>
    </Animated.View>
  );
}

/** Bir satır; shake artınca yana sarsılır. */
function Row({ cells, rowIndex, size, revealing, shake, win, t }) {
  const x = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!shake || reduce) return;
    x.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 80 }), withTiming(-6, { duration: 80 }), withTiming(6, { duration: 70 }), withTiming(0, { duration: 50 }));
  }, [shake, reduce, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View accessibilityRole="none" style={[{ flexDirection: 'row', gap: GAP }, style]}>
      {cells.map((c, i) => (
        <Tile
          key={i}
          letter={c.letter}
          state={c.state}
          reveal={revealing}
          index={i}
          size={size}
          win={win}
          label={t('games.letterGuess.cell', {
            row: rowIndex + 1, col: i + 1, letter: c.letter ? c.letter.toUpperCase() : t('games.letterGuess.empty'),
            state: c.state ? t(`games.letterGuess.${c.state}`) : t('games.letterGuess.empty'),
          })}
        />
      ))}
    </Animated.View>
  );
}

/** Tahta: 6 satır × 5 harf. revealRow: şimdi açılan satır, shakeToken: her artışta yazılan satır sarsılır, winRow: kazanan satır zıplar. */
export function LetterGuessBoard({ guesses, draft, rows = 6, length = 5, revealRow = -1, shakeToken = 0, winRow = -1, active = true }) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const size = Math.min(62, Math.floor((Math.min(width, 520) - 32 - GAP * (length - 1)) / length));
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    const g = guesses[r];
    const isDraft = !g && active && r === guesses.length;
    const letters = g ? g.word : isDraft ? draft : '';
    const cells = [];
    for (let c = 0; c < length; c += 1) cells.push({ letter: letters[c] || '', state: g ? g.marks[c] : null });
    out.push(
      <Row key={r} cells={cells} rowIndex={r} size={size} revealing={r === revealRow} shake={isDraft ? shakeToken : 0} win={r === winRow} t={t} />,
    );
  }
  return <View style={{ gap: GAP, alignItems: 'center' }}>{out}</View>;
}
