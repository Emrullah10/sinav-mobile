import { Check, GraduationCap } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text as Span, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { tokenize } from '@shared/vendor/domain/lexicon-text.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { EASE_IN_OUT, EASE_OUT, useEntrance, useFadeUp } from './motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── 1. Marka: halka çizilir, amber nokta yerine oturur, etrafında sakin dalgalar ──
const ARC = 'M769.2 462.0A262 262 0 1 1 534.8 251.0'; // BrandMark ile aynı geometri
const ARC_LEN = 1650; // yaklaşık yay uzunluğu (tam çizim için yeter)

function Ripple({ delay, reduced, color, size }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(v);
  }, [reduced, delay, v]);
  const s = useAnimatedStyle(() => ({
    opacity: (1 - v.value) * 0.35,
    transform: [{ scale: 0.7 + v.value * 0.8 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        },
        s,
      ]}
    />
  );
}

export function HeroScene({ active, reduced }) {
  const { t } = useT();
  const { colors } = useTheme();
  const draw = useSharedValue(reduced ? 1 : 0);
  const dot = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced || !active) return undefined;
    draw.value = withTiming(1, { duration: 1100, easing: EASE_IN_OUT });
    dot.value = withDelay(850, withSpring(1, { damping: 8, stiffness: 170 }));
    pulse.value = withDelay(
      1700,
      withRepeat(
        withSequence(
          withTiming(1.14, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [active, reduced, draw, dot, pulse]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: ARC_LEN * (1 - draw.value) }));
  const dotProps = useAnimatedProps(() => ({ r: 64 * dot.value * pulse.value }));
  const title = useFadeUp(useEntrance(active, reduced, 450));
  const tagline = useFadeUp(useEntrance(active, reduced, 650));
  const exams = t('intro.exams')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
        <Ripple delay={1300} reduced={reduced} color={colors.accent.default} size={132} />
        <Ripple delay={2600} reduced={reduced} color={colors.reward.default} size={132} />
        <Svg
          width={112}
          height={112}
          viewBox="0 0 1024 1024"
          accessibilityRole="image"
          accessibilityLabel={t('app.name')}
        >
          <AnimatedPath
            d={ARC}
            fill="none"
            stroke={colors.accent.default}
            strokeWidth={112}
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            animatedProps={ringProps}
          />
          <AnimatedCircle
            cx={687.3}
            cy={317.3}
            fill={colors.reward.default}
            animatedProps={dotProps}
          />
        </Svg>
      </View>
      <Animated.View style={title}>
        <Text variant="display-l" accessibilityRole="header">
          {t('app.name')}
        </Text>
      </Animated.View>
      <Animated.View style={tagline}>
        <Text variant="heading-3" color="secondary">
          {t('auth.welcome.tagline')}
        </Text>
      </Animated.View>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        accessible
        accessibilityLabel={t('intro.exams')}
      >
        {exams.map((e, i) => (
          <ExamChip key={e} label={e} active={active} reduced={reduced} delay={900 + i * 140} />
        ))}
      </View>
    </View>
  );
}

function ExamChip({ label, active, reduced, delay }) {
  const { colors, radius } = useTheme();
  const v = useEntrance(active, reduced, delay, 360);
  const s = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.85 + v.value * 0.15 }, { translateY: (1 - v.value) * 8 }],
  }));
  return (
    <Animated.View
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.full,
          backgroundColor: colors.accent['subtle-bg'],
        },
        s,
      ]}
    >
      <Text variant="label-m" color="accent">
        {label}
      </Text>
    </Animated.View>
  );
}

// ── 2. Plan: haftalık şerit dolar, bugünün görevleri sırayla işaretlenir, halka ilerler ──
const RING_R = 18;
const RING_LEN = 2 * Math.PI * RING_R;

function DayDot({ i, active, reduced }) {
  const { colors } = useTheme();
  const done = i < 4;
  const today = i === 4;
  const v = useEntrance(active, reduced, 150 + i * 90, 300);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!today || reduced || !active) return undefined;
    pulse.value = withDelay(
      800,
      withRepeat(
        withSequence(withTiming(1.15, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [today, reduced, active, pulse]);
  const s = useAnimatedStyle(() => ({
    opacity: 0.25 + v.value * 0.75,
    transform: [{ scale: (0.6 + v.value * 0.4) * pulse.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? colors.accent.default : colors.bg.surface,
          borderWidth: done ? 0 : 2,
          borderColor: today ? colors.reward.default : colors.border.default,
        },
        s,
      ]}
    >
      {done ? <Check size={14} color={colors.text['on-accent']} strokeWidth={3} /> : null}
    </Animated.View>
  );
}

function TaskRow({ label, index, active, reduced, onChecked }) {
  const { colors } = useTheme();
  const enter = useEntrance(active, reduced, 500 + index * 140, 380);
  const check = useSharedValue(reduced ? 1 : 0);
  const played = useRef(false);
  const alive = useRef(true);
  const cb = useRef(onChecked);
  useEffect(() => {
    cb.current = onChecked;
  });
  useEffect(() => () => (alive.current = false), []);
  useEffect(() => {
    // Bir kez oynar (yeniden çizimde ya da sayfaya dönünce tekrar işaretlenmez).
    if (reduced || !active || played.current) return undefined;
    played.current = true;
    const at = 1300 + index * 650;
    check.value = withDelay(at, withSpring(1, { damping: 22, stiffness: 260 }));
    setTimeout(() => alive.current && cb.current?.(index), at); // sayfadan çıkılsa da halka sonuna kadar dolsun
    return undefined;
  }, [active, reduced, index, check]);
  const row = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateX: (1 - enter.value) * 24 }],
  }));
  const box = useAnimatedStyle(() => ({ transform: [{ scale: check.value }] }));
  const text = useAnimatedStyle(() => ({ opacity: 1 - check.value * 0.45 }));
  return (
    <Animated.View
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 }, row]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: colors.border.strong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.success.fg,
              alignItems: 'center',
              justifyContent: 'center',
            },
            box,
          ]}
        >
          <Check size={14} color={colors.text['on-accent']} strokeWidth={3} />
        </Animated.View>
      </View>
      <Animated.View style={[{ flex: 1 }, text]}>
        <Text variant="body-m">{label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function PlanScene({ active, reduced, width }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const haptics = useHaptics();
  const card = useFadeUp(useEntrance(active, reduced, 0, 480), 24);
  const progress = useSharedValue(reduced ? 1 : 0);
  const tasks = [t('intro.plan.task1'), t('intro.plan.task2'), t('intro.plan.task3')];
  const onChecked = (i) => {
    progress.value = withTiming((i + 1) / tasks.length, { duration: 500, easing: EASE_OUT });
    haptics.select();
  };
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - progress.value) }));
  return (
    <Animated.View
      style={[
        {
          width: Math.min(340, width - 32),
          padding: 14,
          gap: 10,
          borderRadius: radius.xl,
          backgroundColor: colors.bg.surface,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        card,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text variant="label-m" color="accent">
            {t('intro.plan.today')}
          </Text>
          <Text variant="caption" color="tertiary">
            {t('intro.plan.streak')}
          </Text>
        </View>
        <Svg width={44} height={44} viewBox="0 0 44 44">
          <Circle
            cx={22}
            cy={22}
            r={RING_R}
            stroke={colors.border.subtle}
            strokeWidth={5}
            fill="none"
          />
          <AnimatedCircle
            cx={22}
            cy={22}
            r={RING_R}
            stroke={colors.success.fg}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_LEN}
            rotation={-90}
            origin="22, 22"
            animatedProps={ringProps}
          />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: 7 }, (_, i) => (
          <DayDot key={i} i={i} active={active} reduced={reduced} />
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border.subtle }} />
      <View>
        {tasks.map((label, i) => (
          <TaskRow
            key={i}
            index={i}
            label={label}
            active={active}
            reduced={reduced}
            onChecked={onChecked}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ── 3. Dokun-çevir: deneme metni (dokununca anlam kutusu yumuşakça gelir) ──
const DEMO_WORDS = ['regular', 'exercise', 'can', 'significantly', 'improve', 'your', 'memory'];

export function TapScene({ active, reduced, width }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const haptics = useHaptics();
  const [pick, setPick] = useState(null); // { word } | { sentence: true }
  const card = useFadeUp(useEntrance(active, reduced, 0, 480), 24);
  const hint = useSharedValue(1);
  useEffect(() => {
    if (reduced || !active || pick) return undefined;
    hint.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
    return () => cancelAnimation(hint);
  }, [reduced, active, pick, hint]);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value }));
  const { tokens } = tokenize(t('intro.demo.sentence'));
  return (
    <Animated.View style={[{ gap: 10, width: width - 32 }, card]}>
      <View
        style={{
          padding: 14,
          borderRadius: radius.md,
          backgroundColor: colors.bg.surface,
          borderWidth: 1,
          borderColor: colors.border.default,
        }}
      >
        <Text variant="reading-l" accessibilityHint={t('lex.a11yHint')}>
          {tokens.map((tok, i) => {
            const w = tok.word ? tok.text.toLowerCase() : null;
            const hl = pick?.sentence
              ? { backgroundColor: colors.bg.selected }
              : w && pick?.word === w
                ? { backgroundColor: colors.accent['subtle-bg'], color: colors.accent['subtle-fg'] }
                : null;
            if (!w || !DEMO_WORDS.includes(w))
              return hl ? (
                <Span key={i} style={hl}>
                  {tok.text}
                </Span>
              ) : (
                tok.text
              );
            return (
              <Span
                key={i}
                suppressHighlighting
                style={hl}
                onPress={() => {
                  haptics.select();
                  setPick({ word: w });
                }}
                onLongPress={() => {
                  haptics.soft();
                  setPick({ sentence: true });
                }}
              >
                {tok.text}
              </Span>
            );
          })}
        </Text>
      </View>
      <View
        accessibilityLiveRegion="polite"
        style={{
          minHeight: 64,
          padding: 12,
          borderRadius: radius.md,
          backgroundColor: pick ? colors.accent['subtle-bg'] : colors.bg.surface,
          borderWidth: 1,
          borderColor: pick ? 'transparent' : colors.border.subtle,
          justifyContent: 'center',
        }}
      >
        {pick ? (
          <Animated.View
            key={pick.word || 'sentence'}
            entering={reduced ? undefined : FadeInDown.duration(220).easing(EASE_OUT)}
          >
            {pick.word ? (
              <>
                <Text variant="title">{pick.word}</Text>
                <Text variant="body-m" style={{ color: colors.accent['subtle-fg'] }}>
                  {t(`intro.demo.${pick.word}`)}
                </Text>
              </>
            ) : (
              <Text variant="body-l" style={{ color: colors.accent['subtle-fg'] }}>
                {t('intro.demo.translation')}
              </Text>
            )}
          </Animated.View>
        ) : (
          <Animated.View style={hintStyle}>
            <Text variant="body-m" color="tertiary">
              {t('intro.demo.hint')}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// ── 4. Öğretmen: öğrenci sorar, "yazıyor…" noktaları, öğretmen adım adım cevaplar ──
function TypingDot({ i, run }) {
  const { colors } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    if (!run) return undefined;
    v.value = withDelay(
      i * 130,
      withRepeat(
        withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 280 })),
        -1,
      ),
    );
    return () => cancelAnimation(v);
  }, [run, i, v]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: -v.value * 4 }],
    opacity: 0.4 + v.value * 0.6,
  }));
  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text.tertiary }, s]}
    />
  );
}

export function TutorScene({ active, reduced, width }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const w = Math.min(340, width - 32);
  const question = useEntrance(active, reduced, 150, 380);
  const typing = useSharedValue(0);
  const answer = useEntrance(active, reduced, 1900, 420);
  const steps = useEntrance(active, reduced, 2400, 380);
  const typed = useRef(false);
  useEffect(() => {
    if (reduced || !active || typed.current) return;
    typed.current = true;
    typing.value = withDelay(
      650,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1000, withTiming(0, { duration: 200 })),
      ),
    );
  }, [active, reduced, typing]);
  const q = useAnimatedStyle(() => ({
    opacity: question.value,
    transform: [{ translateX: (1 - question.value) * 30 }],
  }));
  const ty = useAnimatedStyle(() => ({ opacity: typing.value }));
  const a = useAnimatedStyle(() => ({
    opacity: answer.value,
    transform: [{ translateY: (1 - answer.value) * 12 }],
  }));
  const st = useAnimatedStyle(() => ({
    opacity: steps.value,
    transform: [{ scale: 0.9 + steps.value * 0.1 }],
  }));
  const bubble = {
    maxWidth: w * 0.82,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  };
  return (
    <View style={{ width: w, gap: 10 }}>
      <Animated.View
        style={[
          {
            alignSelf: 'flex-end',
            backgroundColor: colors.accent.default,
            borderBottomRightRadius: 4,
          },
          bubble,
          q,
        ]}
      >
        <Text variant="body-m" style={{ color: colors.text['on-accent'] }}>
          {t('intro.chat.question')}
        </Text>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.accent['subtle-bg'],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GraduationCap size={18} color={colors.accent.default} />
        </View>
        <View style={{ flex: 1 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                flexDirection: 'row',
                gap: 5,
                alignSelf: 'flex-start',
                backgroundColor: colors.bg.surface,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: radius.lg,
              },
              ty,
            ]}
          >
            {[0, 1, 2].map((i) => (
              <TypingDot key={i} i={i} run={active && !reduced} />
            ))}
          </Animated.View>
          <Animated.View
            style={[
              {
                alignSelf: 'flex-start',
                backgroundColor: colors.bg.surface,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                borderTopLeftRadius: 4,
                gap: 10,
              },
              bubble,
              a,
            ]}
          >
            <Text variant="body-m">{t('intro.chat.answer')}</Text>
            <Animated.View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, st]}>
              {[t('intro.chat.step1'), t('intro.chat.step2')].map((s) => (
                <View
                  key={s}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.full,
                    backgroundColor: colors.reward['subtle-bg'],
                  }}
                >
                  <Text variant="label-s" style={{ color: colors.reward.on }}>
                    {s}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
