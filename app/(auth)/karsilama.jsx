import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Screen, Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useOnboardingStore } from '@store/onboardingStore';

// Karşılama: "Başla" misafir oturumu açıp onboarding'e (app/index.jsx), "Hesabım var" girişe götürür.
export default function Welcome() {
  const { t } = useT();
  const setWelcomeSeen = useOnboardingStore((s) => s.setWelcomeSeen);
  return (
    <Screen edges={['top', 'bottom']} scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Text variant="display-l" accessibilityRole="header">
          {t('app.name')}
        </Text>
        <Text variant="body-l" color="secondary">
          {t('auth.welcome.tagline')}
        </Text>
      </View>
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
          onPress={() => router.push('/giris')}
        />
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
