import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Button, Card, ListRow, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, formatClock, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

export default function SessionResult() {
  const { id: code } = useLocalSearchParams();
  const { t } = useT();
  const toast = useToast();
  const query = useQuery({
    queryKey: queryKeys.learning.sessionResult(code),
    queryFn: async () => unwrap(await api.learningSessionResultGet(code)),
  });
  const retry = useMutation({
    mutationFn: async () => unwrap(await api.learningMistakeReviewStart({ limit: 10 })),
    onSuccess: (res) => (res.code ? router.replace(deepLinks.question(res.code)) : toast.show({ message: t('mistakes.reviewEmpty') })),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const similar = useMutation({
    mutationFn: async (n) => unwrap(await api.learningPracticeSessionCreate({ questionTypeKeys: n.questionTypeKeys, skillKeys: n.skillKeys, count: n.count })),
    onSuccess: (res) => router.replace(deepLinks.question(res.code)),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  return (
    <Screen
      header={<TopBar title={t('session.result.title')} />}
      edges={['bottom']}
      footer={<Button title={t('session.result.today')} onPress={() => router.replace(deepLinks.today)} />}
    >
      <QueryBoundary query={query}>
        {(r) => (
          <View style={{ gap: 16 }}>
            <Card elevation="e1" style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="numeric-xl">{`%${Math.round(r.totals.accuracy || 0)}`}</Text>
              <Text variant="body-m" color="secondary">
                {t('session.result.totals', { correct: r.totals.correct, wrong: r.totals.wrong, blank: r.totals.blank })}
              </Text>
              <Text variant="caption" color="tertiary">
                {t('session.result.time', { total: formatClock(r.time.totalSeconds), avg: Math.round(r.time.avgSecondsPerQuestion || 0) })}
              </Text>
              {r.hints.used || r.hints.solutionsViewed ? (
                <Text variant="caption" color="tertiary">
                  {t('session.result.hints', { n: r.hints.used, s: r.hints.solutionsViewed })}
                </Text>
              ) : null}
            </Card>

            {r.skillChanges?.length ? (
              <View>
                <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('session.result.skills')}</Text>
                {r.skillChanges.map((c) => (
                  <ListRow
                    key={c.skillKey}
                    title={c.name}
                    value={`${c.delta > 0 ? '+' : ''}${Math.round(c.delta)}`}
                    chevron={false}
                  />
                ))}
              </View>
            ) : null}

            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('session.result.items')}</Text>
              {r.items.map((it, i) => (
                <ListRow
                  key={it.itemCode}
                  title={`${it.position}. ${it.stemPreview || it.typeName || ''}`}
                  subtitle={[it.typeName, it.selectedLabel ? `${it.selectedLabel}→${it.correctLabel}` : null].filter(Boolean).join(' · ')}
                  value={t(`session.result.status.${it.isCorrect ? 'correct' : it.status === 'skipped' || !it.selectedLabel ? 'blank' : 'wrong'}`)}
                  chevron={false}
                  divider={i < r.items.length - 1}
                />
              ))}
            </View>

            <View style={{ gap: 8 }}>
              {r.mistakes?.length ? (
                <Button title={t('session.result.retryMistakes')} variant="secondary" loading={retry.isPending} onPress={() => retry.mutate()} />
              ) : null}
              {r.nextActions?.similar ? (
                <Button title={t('session.result.similar')} variant="secondary" loading={similar.isPending} onPress={() => similar.mutate(r.nextActions.similar)} />
              ) : null}
              {r.nextActions?.noteItemCode ? (
                <Button title={t('session.result.note')} variant="tertiary" onPress={() => router.push(deepLinks.note(r.nextActions.noteItemCode))} />
              ) : null}
            </View>
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
