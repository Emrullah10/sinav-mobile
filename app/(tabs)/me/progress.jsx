import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Card, EmptyState, ProgressBar, QueryBoundary, Screen, Segmented, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

export default function ProgressScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const [range, setRange] = useState(7);
  const query = useQuery({
    queryKey: queryKeys.learning.progress(range),
    queryFn: async () => unwrap(await api.learningProgressOverviewGet(range)),
  });
  return (
    <Screen header={<TopBar title={t('progress.title')} onBack={() => router.back()} />} edges={['bottom']}>
      <View style={{ gap: 16 }}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[7, 30, 90].map((n) => ({ value: n, label: t('progress.range', { n }) }))}
        />
        <QueryBoundary query={query}>
          {(d) => {
            const maxMin = Math.max(1, ...d.days.map((x) => x.activeMinutes));
            return (
              <View style={{ gap: 16 }}>
                <Card elevation="e1" style={{ gap: 4 }}>
                  <Text variant="overline" color="tertiary">{t('progress.estimate')}</Text>
                  {d.estimate ? (
                    <Text variant="numeric-xl">{t('today.estimate.range', { low: d.estimate.low, high: d.estimate.high })}</Text>
                  ) : (
                    <Text variant="body-m" color="secondary">{t('today.estimate.none')}</Text>
                  )}
                  {d.target ? <Text variant="body-s" color="secondary">{t('progress.target', { score: d.target.score })}</Text> : null}
                </Card>
                <Card style={{ gap: 4 }}>
                  <Text variant="body-m">{t('progress.minutes', { n: d.totals.activeMinutes })}</Text>
                  <Text variant="body-m">{t('progress.questions', { n: d.totals.questionsAnswered })}</Text>
                  <Text variant="body-m">{t('progress.accuracy', { n: Math.round(d.totals.accuracy || 0) })}</Text>
                  <Text variant="body-m">{t('progress.cards', { n: d.totals.cardsReviewed })}</Text>
                  <Text variant="body-m">{t('progress.activeDays', { n: d.totals.activeDays })}</Text>
                </Card>
                {d.totals.activeDays === 0 ? <EmptyState title={t('progress.empty')} /> : null}
                {range <= 30 ? (
                  <View style={{ gap: 8 }}>
                    <Text variant="heading-3">{t('progress.daily')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 96 }} accessibilityLabel={t('progress.daily')}>
                      {d.days.map((x) => (
                        <View
                          key={x.date}
                          style={{
                            flex: 1,
                            height: Math.max(3, (x.activeMinutes / maxMin) * 96),
                            borderRadius: 2,
                            backgroundColor: x.goalMet ? colors.success.fg : colors.chart['series-1'],
                          }}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                <View style={{ gap: 10 }}>
                  <Text variant="heading-3">{t('progress.types')}</Text>
                  {d.types.map((ty) => (
                    <View key={ty.key} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="body-m" style={{ flex: 1 }}>{ty.name}</Text>
                        <Text variant="label-m" color="secondary">{`%${Math.round(ty.mastery || 0)}`}</Text>
                      </View>
                      <ProgressBar value={(ty.mastery || 0) / 100} />
                    </View>
                  ))}
                </View>
              </View>
            );
          }}
        </QueryBoundary>
      </View>
    </Screen>
  );
}
