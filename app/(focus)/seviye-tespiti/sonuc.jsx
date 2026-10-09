import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Button, Card, ProgressBar, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';

export default function DiagnosticResult() {
  const { code } = useLocalSearchParams();
  const { t } = useT();
  const query = useQuery({
    queryKey: queryKeys.learning.diagnosticResult(code),
    queryFn: async () => unwrap(await api.learningDiagnosticResultGet(code)),
  });
  const next = () => router.replace('/plan-onizleme');
  return (
    <Screen
      header={<TopBar title={t('diag.result.title')} />}
      edges={['bottom']}
      footer={<Button title={t('diag.result.plan')} onPress={next} />}
    >
      <QueryBoundary query={query}>
        {(r) => {
          const names = Object.fromEntries(r.types.map((x) => [x.typeKey, x.name]));
          return (
            <View style={{ gap: 16 }}>
              <Card elevation="e1" style={{ gap: 4, alignItems: 'center' }}>
                <Text variant="overline" color="tertiary">
                  {t('diag.result.estimate')}
                </Text>
                <Text variant="numeric-xl" accessibilityLabel={`${r.estimate.low} - ${r.estimate.high}`}>
                  {t('diag.result.range', { low: r.estimate.low, high: r.estimate.high })}
                </Text>
                {r.estimate.confidence != null && r.estimate.confidence < 0.6 ? (
                  <Text variant="caption" color="tertiary">
                    {t('diag.result.lowConfidence')}
                  </Text>
                ) : null}
              </Card>
              {r.target ? (
                <Text variant="body-m" color="secondary">
                  {t('diag.result.target', { score: r.target.score, n: r.target.requiredCorrect })}
                  {r.target.gapPoints > 0 ? `  ·  ${t('diag.result.gap', { n: r.target.gapPoints })}` : ''}
                </Text>
              ) : null}
              <Text variant="body-m">
                {t('diag.result.totals', { correct: r.totals.correct, wrong: r.totals.wrong, blank: r.totals.blank })}
              </Text>
              {r.strongest?.length ? (
                <View style={{ gap: 4 }}>
                  <Text variant="heading-3">{t('diag.result.strongest')}</Text>
                  <Text variant="body-m" color="secondary">
                    {r.strongest.map((k) => names[k] || k).join(', ')}
                  </Text>
                </View>
              ) : null}
              {r.weakest?.length ? (
                <View style={{ gap: 4 }}>
                  <Text variant="heading-3">{t('diag.result.weakest')}</Text>
                  <Text variant="body-m" color="secondary">
                    {r.weakest.map((k) => names[k] || k).join(', ')}
                  </Text>
                </View>
              ) : null}
              <Text variant="heading-3">{t('diag.result.byType')}</Text>
              {r.types
                .filter((x) => x.answered > 0)
                .map((x) => (
                  <View key={x.typeKey} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="body-m" style={{ flex: 1 }}>
                        {x.name}
                      </Text>
                      <Text variant="label-m" color="secondary">
                        {t('diag.result.accuracy', { n: Math.round((x.estimatedAccuracy ?? 0) * 100) })}
                      </Text>
                    </View>
                    <ProgressBar value={x.estimatedAccuracy ?? 0} />
                  </View>
                ))}
            </View>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
