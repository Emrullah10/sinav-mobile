import { getLocales } from 'expo-localization';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { report } from '@shared/monitoring/report';

// Kök hata ekranı: sağlayıcılar (tema/i18n) çökmüş olabilir, bu yüzden yalnız RN ilkelleri ve iki dilli sabit metin kullanır.
const COPY = {
  tr: {
    title: 'Bir şeyler ters gitti',
    body: 'Uygulamada beklenmeyen bir hata oluştu. Yeniden denemeyi dene.',
    retry: 'Tekrar dene',
  },
  en: {
    title: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again.',
    retry: 'Try again',
  },
};
const PALETTE = {
  light: { bg: '#F4F6F5', fg: '#0E171B', sub: '#51606A', accent: '#0E6A6E', onAccent: '#FFFFFF' },
  dark: { bg: '#0E171B', fg: '#F4F6F5', sub: '#9DAAB3', accent: '#3FB6BA', onAccent: '#0E171B' },
};

export function RootErrorFallback({ error, retry }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = PALETTE[scheme];
  const lang = getLocales?.()?.[0]?.languageCode === 'en' ? 'en' : 'tr';
  const copy = COPY[lang];
  report(error, { where: 'root-error-boundary' });
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: c.fg, fontSize: 22, fontWeight: '600', textAlign: 'center' }}
      >
        {copy.title}
      </Text>
      <Text style={{ color: c.sub, fontSize: 16, textAlign: 'center' }}>{copy.body}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{
          minHeight: 48,
          paddingHorizontal: 24,
          borderRadius: 12,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 8,
        }}
      >
        <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '600' }}>{copy.retry}</Text>
      </Pressable>
    </View>
  );
}
