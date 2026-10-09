import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Banner, Button, Card, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, formatClock, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

function Analysis({ code }) {
  const { t } = useT();
  const toast = useToast();
  const query = useQuery({
    queryKey: queryKeys.learning.examAnalysis(code),
    queryFn: async () => unwrap(await api.learningExamAnalysisGet(code)),
  });
  const add = useMutation({
    mutationFn: async (typeKey) => unwrap(await api.learningPlanAdjust({ focus: { questionTypeKey: typeKey } })),
    onSuccess: () => toast.show({ message: t('exam.analysis.added'), tone: 'success' }),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  return (
    <QueryBoundary query={query}>
      {(a) => (
        <View style={{ gap: 12 }}>
          <Text variant="heading-3">{t('exam.result.analysis')}</Text>
          <Card style={{ gap: 4 }}>
            <Text variant="label-m" color="secondary">{t('exam.analysis.habits')}</Text>
            <Text variant="body-m">{t('exam.analysis.rushed', { n: a.habits.rushedWrongCount })}</Text>
            <Text variant="body-m">{t('exam.analysis.slow', { n: a.habits.slowCorrectCount })}</Text>
            <Text variant="body-m">{t('exam.analysis.blank', { n: Math.round(a.habits.blankRate || 0) })}</Text>
          </Card>
          {a.potentialExtraCorrect != null ? (
            <Text variant="body-m" color="secondary">{t('exam.analysis.potential', { n: a.potentialExtraCorrect })}</Text>
          ) : null}
          {a.focus?.length ? (
            <View>
              <Text variant="label-m" color="secondary">{t('exam.analysis.focus')}</Text>
              {a.focus.map((f, i) => (
                <ListRow
                  key={f.typeKey}
                  title={f.name}
                  subtitle={`%${Math.round(f.accuracy || 0)}`}
                  chevron={false}
                  divider={i < a.focus.length - 1}
                  trailing={<Button title={t('exam.analysis.addToPlan')} size="sm" variant="secondary" fullWidth={false} onPress={() => add.mutate(f.typeKey)} />}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </QueryBoundary>
  );
}

export default function ExamResult() {
  const { id: code } = useLocalSearchParams();
  const { t } = useT();
  const query = useQuery({
    queryKey: queryKeys.learning.examResult(code),
    queryFn: async () => unwrap(await api.learningExamResultGet(code)),
  });
  return (
    <Screen
      header={<TopBar title={t('exam.result.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/deneme'))} />}
      edges={['bottom']}
      footer={<Button title={t('exam.result.today')} onPress={() => router.replace(deepLinks.today)} />}
    >
      <QueryBoundary query={query}>
        {(r) => (
          <View style={{ gap: 16 }}>
            <Card elevation="e1" style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="overline" color="tertiary">{r.title}</Text>
              <Text variant="numeric-xl">{t('exam.result.score', { score: r.score, max: r.scoreMax })}</Text>
              <Text variant="body-m" color="secondary">{t('exam.result.totals', { correct: r.correct, wrong: r.wrong, blank: r.blank })}</Text>
              {r.isPersonalBest ? <Text variant="label-m" color="success">{t('exam.result.best')}</Text> : null}
              {r.deltaFromPrevious != null ? (
                <Text variant="caption" color="tertiary">{t('exam.result.delta', { n: `${r.deltaFromPrevious > 0 ? '+' : ''}${r.deltaFromPrevious}` })}</Text>
              ) : null}
            </Card>
            {r.submitReason === 'timeout' ? <Banner tone="info" message={t('exam.result.timeout')} /> : null}
            <Text variant="body-m" color="secondary">
              {t('exam.result.time', { used: formatClock(r.time.usedSeconds), limit: formatClock(r.time.limitSeconds) })}
            </Text>
            {r.target ? (
              <Text variant="body-m">
                {r.target.gapPoints > 0 ? t('exam.result.target', { score: r.target.score, n: r.target.gapPoints }) : t('exam.result.targetMet')}
              </Text>
            ) : null}
            {r.estimate ? <Text variant="body-s" color="secondary">{t('exam.result.estimate', { low: r.estimate.low, high: r.estimate.high })}</Text> : null}

            <View style={{ gap: 8 }}>
              <Text variant="heading-3">{t('exam.result.byType')}</Text>
              {r.types.map((ty) => (
                <View key={ty.key} style={{ gap: 4 }}>
                  <Text variant="body-m">{ty.name}</Text>
                  <ProgressBar value={ty.total ? ty.correct / ty.total : 0} />
                  <Text variant="caption" color="tertiary">{t('exam.result.type', { correct: ty.correct, total: ty.total, s: Math.round(ty.avgSeconds || 0) })}</Text>
                </View>
              ))}
            </View>

            <Button title={t('exam.result.review')} variant="secondary" onPress={() => router.push(`/deneme/${code}/inceleme`)} />
            {r.analysisLocked ? (
              <Banner tone="info" message={t('exam.result.analysisLocked')} action={{ label: t('today.access.upgrade'), onPress: () => router.push('/premium') }} />
            ) : (
              <Analysis code={code} />
            )}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
