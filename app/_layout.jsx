import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import '@shared/translation/i18n';
import { AppProviders } from '@shared/providers/AppProviders';
import { initMonitoring, wrapRoot } from '@shared/monitoring/report';
import { RemindersSync } from '@shared/notifications/RemindersSync';
import { PreferencesSync } from '@features/background/PreferencesSync';
import { PurchasesIdentity } from '@shared/purchases/PurchasesIdentity';
import { RootErrorFallback } from '@shared/RootErrorFallback';
import { ShakeToFeedback } from '@features/feedback/ShakeToFeedback';
import { useSessionEndedRedirect } from '@shared/navigation/useSessionEndedRedirect';
import i18n from '@shared/translation/i18n';
import { useUiStore } from '@store/uiStore';
import { fontAssets, ThemeTransitionLayer, useTheme } from '@theme';

initMonitoring();
SplashScreen.preventAutoHideAsync().catch(() => {});

// expo-router: rota ağacındaki işlenmemiş hata bu ekranı gösterir (sağlayıcılardan bağımsız).
export function ErrorBoundary({ error, retry }) {
  return <RootErrorFallback error={error} retry={retry} />;
}

function RootStack() {
  const { colors, isDark } = useTheme();
  useSessionEndedRedirect();
  const language = useUiStore((s) => s.language);
  useEffect(() => {
    if (language && i18n.language !== language) i18n.changeLanguage(language);
  }, [language]);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PurchasesIdentity />
      <RemindersSync />
      <PreferencesSync />
      <ShakeToFeedback />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.canvas } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(focus)" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
      </Stack>
      <ThemeTransitionLayer />
    </>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

export default wrapRoot(RootLayout);
