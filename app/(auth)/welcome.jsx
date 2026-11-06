import { router } from 'expo-router';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Button, Screen, Segmented, Text } from '@components';
import { IntroBackdrop, IntroDots, IntroSlide } from '@features/intro/IntroChrome';
import { HeroScene, PlanScene, TapScene, TutorScene } from '@features/intro/scenes';
import { useHaptics } from '@hooks/useHaptics';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { deepLinks } from '@shared/navigation/deepLinks';
import { LANGUAGE_OPTIONS_SHORT, chooseLanguage } from '@shared/translation/language';
import { useT } from '@shared/translation/useT';
import { useOnboardingStore } from '@store/onboardingStore';

const COUNT = 4;

function SlideText({ title, body }) {
  return (
    <>
      <Text variant="heading-1" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body-l" color="secondary">
        {body}
      </Text>
    </>
  );
}

// Karşılama: animasyonlu tanıtım (kaydırmaya bağlı parallax, sayfa başına canlanan sahneler) + "Başla"
// (misafir oturumu açıp onboarding'e, app/index.jsx) / "Hesabım var". Azaltılmış harekette sahneler durağan.
export default function Welcome() {
  const { t, language } = useT();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const haptics = useHaptics();
  const setWelcomeSeen = useOnboardingStore((s) => s.setWelcomeSeen);
  const [page, setPage] = useState(0);
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  // Sayfa yarı yolda değişir: sahne kaydırma bitmeden canlanmaya başlar.
  const onPage = (p) => {
    setPage(p);
    haptics.select();
  };
  useAnimatedReaction(
    () => Math.round(scrollX.value / width),
    (cur, prev) => {
      if (prev !== null && cur !== prev) scheduleOnRN(onPage, cur);
    },
    [width],
  );
  const slide = (index, props) => (
    <IntroSlide
      key={index}
      index={index}
      scrollX={scrollX}
      width={width}
      reduced={reduced}
      {...props}
    />
  );
  const slides = [
    slide(0, { align: 'stretch', art: <HeroScene active={page === 0} reduced={reduced} /> }),
    slide(1, {
      art: <PlanScene active={page === 1} reduced={reduced} width={width} />,
      children: <SlideText title={t('intro.plan.title')} body={t('intro.plan.body')} />,
    }),
    slide(2, {
      artFirst: false,
      art: <TapScene active={page === 2} reduced={reduced} width={width} />,
      children: <SlideText title={t('intro.tap.title')} body={t('intro.tap.body')} />,
    }),
    slide(3, {
      art: <TutorScene active={page === 3} reduced={reduced} width={width} />,
      children: <SlideText title={t('intro.tutor.title')} body={t('intro.tutor.body')} />,
    }),
  ];
  return (
    <Screen edges={['top', 'bottom']} scroll={false}>
      <IntroBackdrop scrollX={scrollX} width={width} count={COUNT} reduced={reduced} />
      {/* İlk açılışta dil seçimi; sonradan Ben › Ayarlar'dan değişir. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
        <Segmented
          value={language?.slice(0, 2)}
          onChange={chooseLanguage}
          options={LANGUAGE_OPTIONS_SHORT}
          accessibilityLabel={t('settings.language')}
          style={{ width: 112 }}
        />
      </View>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1, marginHorizontal: -16 }}
      >
        {slides.map((s, i) => (
          <Animated.ScrollView
            key={i}
            style={{ width }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingVertical: 8,
              justifyContent: 'center',
            }}
          >
            {s}
          </Animated.ScrollView>
        ))}
      </Animated.ScrollView>
      <IntroDots
        scrollX={scrollX}
        width={width}
        count={COUNT}
        accessibilityLabel={t('intro.slide', { n: page + 1, total: COUNT })}
      />
      <View style={{ gap: 8, paddingBottom: 16 }}>
        <Button
          title={t('auth.welcome.start')}
          onPress={() => {
            setWelcomeSeen(true);
            router.replace('/');
          }}
        />
        <Button
          title={t('auth.welcome.haveAccount')}
          variant="secondary"
          onPress={() => router.push('/sign-in')}
        />
        <Text variant="caption" color="tertiary" align="center">
          {t('auth.welcome.legal')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
          <Button
            title={t('me.legal.terms_of_use')}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/legal/terms_of_use')}
          />
          <Button
            title={t('me.legal.privacy_policy')}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/legal/privacy_policy')}
          />
          <Button
            title={t('me.support')}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            onPress={() => router.push(deepLinks.help)}
          />
        </View>
      </View>
    </Screen>
  );
}
