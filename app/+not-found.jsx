import { router } from 'expo-router';
import { ErrorState, Screen } from '@components';
import { useT } from '@shared/translation/useT';

/** Bilinmeyen yol / derin bağlantı: ana ekrana dön. */
export default function NotFound() {
  const { t } = useT();
  return (
    <Screen>
      <ErrorState
        kind="notFound"
        onRetry={() => router.replace('/')}
        retryLabel={t('state.notFound.home')}
      />
    </Screen>
  );
}
