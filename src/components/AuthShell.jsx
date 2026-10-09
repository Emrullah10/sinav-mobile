import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen } from './Screen';
import { Text } from './Text';
import { TopBar } from './TopBar';

/** Kimlik ekranları iskeleti: geri düğmeli üst çubuk + başlık + alt metin + içerik. */
export function AuthShell({ title, subtitle, children, onBack, back = true }) {
  return (
    <Screen
      header={
        <TopBar onBack={back ? (onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))) : undefined} />
      }
      edges={['bottom']}
    >
      <View style={{ gap: 8, marginBottom: 24 }}>
        <Text variant="display-m" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body-l" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 16 }}>{children}</View>
    </Screen>
  );
}
