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
      </View>
    </Screen>
  );
}
