import { router } from 'expo-router';
import { CalendarCheck, GraduationCap, Languages } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text as Span, View, useWindowDimensions } from 'react-native';
import { BrandMark, Button, Screen, Text } from '@components';
import { tokenize } from '@shared/vendor/domain/lexicon-text.js';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useOnboardingStore } from '@store/onboardingStore';

const DEMO_WORDS = ['regular', 'exercise', 'can', 'significantly', 'improve', 'your', 'memory'];

// Dokun-çevir denemesi: hesap ve ağ gerektirmez (anlamlar çeviri anahtarlarında).
function TapDemo() {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const haptics = useHaptics();
  const [pick, setPick] = useState(null); // { word } | { sentence: true }
  const { tokens } = tokenize(t('intro.demo.sentence'));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ padding: 14, borderRadius: radius.md, backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default }}>
        <Text variant="reading-l" accessibilityHint={t('lex.a11yHint')}>
          {tokens.map((tok, i) => {
            const w = tok.word ? tok.text.toLowerCase() : null;
            const hl =
              pick?.sentence
                ? { backgroundColor: colors.bg.selected }
                : w && pick?.word === w
                  ? { backgroundColor: colors.accent['subtle-bg'], color: colors.accent['subtle-fg'] }
                  : null;
            if (!w || !DEMO_WORDS.includes(w)) return hl ? <Span key={i} style={hl}>{tok.text}</Span> : tok.text;
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
        style={{ minHeight: 64, padding: 12, borderRadius: radius.md, backgroundColor: pick ? colors.accent['subtle-bg'] : colors.bg.canvas, justifyContent: 'center' }}
      >
        {pick?.word ? (
          <>
            <Text variant="title">{pick.word}</Text>
            <Text variant="body-m" style={{ color: colors.accent['subtle-fg'] }}>{t(`intro.demo.${pick.word}`)}</Text>
          </>
        ) : pick?.sentence ? (
          <Text variant="body-l" style={{ color: colors.accent['subtle-fg'] }}>{t('intro.demo.translation')}</Text>
        ) : (
          <Text variant="body-m" color="tertiary">{t('intro.demo.hint')}</Text>
        )}
      </View>
    </View>
  );
}

function Feature({ icon: Icon, title, body, children }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.accent['subtle-bg'], alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={26} color={colors.accent.default} />
      </View>
      <Text variant="heading-1" accessibilityRole="header">{title}</Text>
      <Text variant="body-l" color="secondary">{body}</Text>
      {children}
    </View>
  );
}

// Karşılama: kaydırılabilir tanıtım + "Başla" (misafir oturumu açıp onboarding'e, app/index.jsx) / "Hesabım var".
export default function Welcome() {
  const { t } = useT();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const setWelcomeSeen = useOnboardingStore((s) => s.setWelcomeSeen);
  const [page, setPage] = useState(0);
  const slides = [
    <View key="hero" style={{ gap: 16, justifyContent: 'center', flex: 1 }}>
      <BrandMark size={96} accessibilityLabel={t('app.name')} />
      <Text variant="display-l" accessibilityRole="header">{t('app.name')}</Text>
      <Text variant="heading-3" color="secondary">{t('auth.welcome.tagline')}</Text>
      <Text variant="label-l" color="accent">{t('intro.exams')}</Text>
    </View>,
    <Feature key="plan" icon={CalendarCheck} title={t('intro.plan.title')} body={t('intro.plan.body')} />,
    <Feature key="tap" icon={Languages} title={t('intro.tap.title')} body={t('intro.tap.body')}>
      <TapDemo />
    </Feature>,
    <Feature key="tutor" icon={GraduationCap} title={t('intro.tutor.title')} body={t('intro.tutor.body')} />,
  ];
  return (
    <Screen edges={['top', 'bottom']} scroll={false}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, marginHorizontal: -16 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {slides.map((s, i) => (
          <ScrollView key={i} style={{ width }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 24, justifyContent: 'center' }}>
            {s}
          </ScrollView>
        ))}
      </ScrollView>
      <View
        style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 }}
        accessible
        accessibilityLabel={t('intro.slide', { n: page + 1, total: slides.length })}
      >
        {slides.map((_, i) => (
          <View key={i} style={{ width: i === page ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.accent.default : colors.border.strong }} />
        ))}
      </View>
      <View style={{ gap: 8, paddingBottom: 16 }}>
        <Button
          title={t('auth.welcome.start')}
          onPress={() => {
            setWelcomeSeen(true);
            router.replace('/');
          }}
        />
        <Button title={t('auth.welcome.haveAccount')} variant="secondary" onPress={() => router.push('/giris')} />
        <Text variant="caption" color="tertiary" align="center">
          {t('auth.welcome.legal')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
          <Button title={t('me.legal.terms_of_use')} variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push('/yasal/terms_of_use')} />
          <Button title={t('me.legal.privacy_policy')} variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push('/yasal/privacy_policy')} />
          <Button title={t('me.support')} variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push('/destek')} />
        </View>
      </View>
    </Screen>
  );
}
