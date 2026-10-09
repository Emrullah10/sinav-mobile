import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';

export default function LegalDocument() {
  const { type } = useLocalSearchParams();
  const { t, language } = useT();
  const query = useQuery({
    queryKey: ['identity', 'legal', type, language],
    queryFn: async () => unwrap(await api.identityPublicLegalGet(type, { locale: language })),
  });
  return (
    <Screen header={<TopBar onBack={() => router.back()} title={t('legal.title')} />} edges={['bottom']}>
      <QueryBoundary query={query}>
        {(doc) => (
          <>
            <Text variant="heading-1">{doc.title}</Text>
            <Text variant="caption" color="tertiary" style={{ marginBottom: 12 }}>
              {t('legal.version', { v: doc.version })}
            </Text>
            <Text variant="body-m">{doc.bodyMd}</Text>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
