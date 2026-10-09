import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { AuthBootstrap } from '@shared/auth/AuthBootstrap';
import i18n from '@shared/translation/i18n';
import { ToastProvider } from '@components/Toast';
import { ThemeProvider } from '@theme';
import { queryClient } from './queryClient';

/** Sağlayıcı sırası: Theme → SafeArea/GestureHandler → Query → Auth bootstrap → i18n. */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <AuthBootstrap>
              <I18nextProvider i18n={i18n}>
                <BottomSheetModalProvider>
                  <ToastProvider>{children}</ToastProvider>
                </BottomSheetModalProvider>
              </I18nextProvider>
            </AuthBootstrap>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
