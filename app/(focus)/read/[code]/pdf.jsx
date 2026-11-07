import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, ErrorState, Screen, Skeleton, TopBar } from '@components';
import { api } from '@api';
import { errorKind, unwrap } from '@shared/api/helpers';
import { API_BASE_URL, WEB_BASE_URL } from '@shared/constant/config';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';

/**
 * READ-08: orijinal PDF. Web uygulamasının sade görüntüleyicisi WebView'da açılır (tek görüntüleyici; sayfa ve hata postMessage ile gelir).
 * Süreli bağlantı adresin # kısmındadır: sunucu loglarına düşmez.
 */
export default function PdfScreen() {
  const { code, sayfa } = useLocalSearchParams();
  const { t } = useT();
  const start = Number(sayfa) || 1;
  const [cur, setCur] = useState({ page: start, total: 0 });
  const [failed, setFailed] = useState(false);
  const bookQ = useQuery({ queryKey: queryKeys.content.readingBook(code), queryFn: async () => unwrap(await api.contentReadingBookGet(code)) });
  const urlQ = useQuery({
    queryKey: ['content', 'reading', 'fileUrl', String(code)],
    queryFn: async () => unwrap(await api.contentReadingFileUrl(code)),
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const uri = useMemo(
    () => (urlQ.data ? `${WEB_BASE_URL}/pdf-goruntule#u=${encodeURIComponent(urlQ.data.url)}&p=${start}` : null),
    [urlQ.data, start],
  );
  const onMessage = (e) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'page') setCur({ page: m.page, total: m.total });
      if (m.type === 'error') setFailed(true);
    } catch { /* yoksay */ }
  };
  const book = bookQ.data;
  const toReading = () => {
    const s = book?.sections?.find((x) => x.pageStart && x.pageStart <= cur.page && (x.pageEnd ?? x.pageStart) >= cur.page);
    router.replace({ pathname: deepLinks.reader(code), params: s ? { bolum: String(s.position) } : {} });
  };
  return (
    <Screen
      scroll={false}
      padded={false}
      keyboardAvoiding={false}
      edges={[]}
      header={
        <TopBar
          title={cur.total ? t('read.pdf.pageOf', { n: cur.page, total: cur.total }) : book?.title || ''}
          onBack={() => router.back()}
          right={book?.status === 'ready' ? <Button title={t('read.pdf.readingMode')} leftIcon={BookOpen} variant="secondary" size="sm" fullWidth={false} onPress={toReading} /> : null}
        />
      }
    >
      {urlQ.isError || failed ? (
        <View style={{ gap: 8 }}>
          <ErrorState kind={urlQ.isError ? errorKind(urlQ.error) : 'server'} onRetry={() => { setFailed(false); urlQ.refetch(); }} />
          {/* Son çare: telefonun kendi PDF görüntüleyicisi (süreli bağlantı oturum istemez). */}
          {urlQ.data ? (
            <View style={{ paddingHorizontal: 24 }}>
              <Button title={t('read.pdf.openExternal')} variant="secondary" onPress={() => Linking.openURL(`${API_BASE_URL}${urlQ.data.url}`).catch(() => {})} />
            </View>
          ) : null}
        </View>
      ) : uri ? (
        <WebView
          source={{ uri }}
          onMessage={onMessage}
          onError={() => setFailed(true)}
          onHttpError={() => setFailed(true)}
          originWhitelist={[`${WEB_BASE_URL}*`]}
          startInLoadingState
          renderLoading={() => <View style={{ position: 'absolute', inset: 0, padding: 16 }}><Skeleton height={480} /></View>}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={{ padding: 16 }}><Skeleton height={480} /></View>
      )}
    </Screen>
  );
}
