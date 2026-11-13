import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ProgressBar, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { formatScore, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';

export default function DiagnosticResult() {
  const { code } = useLocalSearchParams();
  const { t, language } = useT();
  const query = useQuery({
    queryKey: queryKeys.learning.diagnosticResult(code),
    queryFn: async () => unwrap(await api.learningDiagnosticResultGet(code)),
  });
  const [retaking, setRetaking] = useState(false);
  const next = () => router.replace('/plan-preview');
  const retake = async () => {
    setRetaking(true);
    try {
      unwrap(await api.learningDiagnosticStart({ retake: true }));
      router.replace('/diagnostic');
    } finally {
      setRetaking(false);
    }
  };
  return (
    <Screen
      header={<TopBar title={t('diag.result.title')} />}
      edges={['bottom']}
      footer={
        query.data?.insufficient ? (
          <View style={{ gap: 8 }}>
            <Button title={t('diag.result.retake')} onPress={retake} loading={retaking} />
            <Button title={t('diag.result.continuePlan')} variant="tertiary" onPress={next} />
          </View>
        ) : (
          <Button title={t('diag.result.plan')} onPress={next} />
        )
      }
    >
      <QueryBoundary query={query}>
        {(r) => {
          const names = Object.fromEntries(r.types.map((x) => [x.typeKey, x.name]));
          if (r.insufficient) {
            return (
              <View style={{ gap: 12 }}>
                <Text variant="heading-3">{t('diag.result.insufficientTitle')}</Text>
                <Text variant="body-m" color="secondary">
                  {t('diag.result.insufficientBody', { n: r.minAnswered, answered: r.totals.answered })}
                </Text>
                <Text variant="body-m">
                  {t('diag.result.totals', { correct: r.totals.correct, wrong: r.totals.wrong, blank: r.totals.blank })}
                </Text>
              </View>
            );
          }
          return (
            <View style={{ gap: 16 }}>
              <Card elevation="e1" style={{ gap: 4, alignItems: 'center' }}>
                <Text variant="overline" color="tertiary">
                  {t('diag.result.estimate')}
                </Text>
                <Text variant="numeric-xl" accessibilityLabel={`${formatScore(Math.floor(r.estimate.low), language)} - ${formatScore(Math.ceil(r.estimate.high), language)}`}>
                  {t('diag.result.range', { low: formatScore(Math.floor(r.estimate.low), language), high: formatScore(Math.ceil(r.estimate.high), language) })}
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
                  {r.target.gapPoints > 0 ? `  ·  ${t('diag.result.gap', { n: formatScore(r.target.gapPoints, language) })}` : ''}
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
                        {t('diag.result.typeLine', { correct: x.correct, answered: x.answered })}
                      </Text>
                    </View>
                    <ProgressBar value={x.answered ? (x.estimatedAccuracy ?? 0) : 0} />
                  </View>
                ))}
            </View>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
