import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Banner, Button, Card, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { formatDate, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';

const Stat = ({ label, value }) => (
  <View style={{ width: '50%', paddingVertical: 8, gap: 2 }}>
    <Text variant="caption" color="tertiary">
      {label}
    </Text>
    <Text variant="numeric-m">{value}</Text>
  </View>
);

const taskTitle = (t, task) =>
  `${t(`enums.plan_task_kind.${task.kind}`)}${task.questionType ? ` · ${task.questionType.name}` : task.skill ? ` · ${task.skill.name}` : ''}`;

/** Gün sonu özeti: bugünün istatistiği, seri ve yarının görevleri (HOME-02). */
export default function DayDone() {
  const { t, language } = useT();
  const query = useQuery({
    queryKey: queryKeys.learning.daySummary(),
    queryFn: async () => unwrap(await api.learningDaySummaryGet()),
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));
  return (
    <Screen
      header={<TopBar title={t('today.sum.title')} onBack={back} />}
      edges={['bottom']}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => {
          const a = d.activity;
          const accuracy = a.questionsAnswered
            ? `%${Math.round(a.accuracy <= 1 ? a.accuracy * 100 : a.accuracy)}`
            : '-';
          const tomorrow = d.tomorrow?.tasks || [];
          return (
            <View style={{ gap: 16 }}>
              <Text variant="caption" color="tertiary">
                {formatDate(d.date, language, { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Banner
                tone={a.goalMet ? 'success' : 'info'}
                title={a.goalMet ? t('today.sum.goalMet') : undefined}
                message={
                  a.goalMet
                    ? t('today.sum.streak', { n: d.streak?.current ?? 0 })
                    : t('today.sum.goalNotMet', { n: a.goalMinutes })
                }
              />
              <Card>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Stat
                    label={t('today.sum.minutes')}
                    value={t('today.sum.min', { n: a.activeMinutes })}
                  />
                  <Stat label={t('today.sum.questions')} value={a.questionsAnswered} />
                  <Stat label={t('today.sum.accuracy')} value={accuracy} />
                  <Stat label={t('today.sum.cards')} value={a.cardsReviewed} />
                  <Stat label={t('today.sum.newCards')} value={a.newCards} />
                  <Stat label={t('today.sum.notes')} value={a.notesRead} />
                </View>
              </Card>
              <Card style={{ gap: 6 }}>
                <Text variant="heading-3">{t('today.sum.tomorrow')}</Text>
                {tomorrow.length === 0 ? (
                  <Text variant="body-m" color="secondary">
                    {t('today.sum.tomorrowNone')}
                  </Text>
                ) : (
                  tomorrow.map((task) => (
                    <Text
                      key={task.code}
                      variant="body-m"
                    >{`${taskTitle(t, task)} · ${t('today.plan.minutes', { n: task.estimatedMinutes })}`}</Text>
                  ))
                )}
              </Card>
              <Button title={t('today.sum.back')} variant="secondary" onPress={back} />
            </View>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
