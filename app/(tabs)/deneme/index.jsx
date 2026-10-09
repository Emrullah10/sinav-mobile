import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge, Card, EmptyState, ListRow, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { formatDate, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const usageLine = (t, kind, u) =>
  !u ? null : !u.enabled || u.remaining === 0 ? `${t(`exam.usage.${kind}`, { n: 0 })}` : u.limit == null ? null : t(`exam.usage.${kind}`, { n: u.remaining });

export default function ExamHome() {
  const { t, language } = useT();
  const { colors } = useTheme();
  const query = useQuery({
    queryKey: queryKeys.learning.exams(),
    queryFn: async () => unwrap(await api.learningExamsOverviewGet()),
  });
  return (
    <Screen
      header={<TopBar variant="large" title={t('exam.title')} />}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            {d.estimate ? (
              <Card elevation="e1">
                <Text variant="body-m">{t('exam.estimate', { low: d.estimate.low, high: d.estimate.high })}</Text>
              </Card>
            ) : null}
            <View>
              {[usageLine(t, 'full', d.usage?.full), usageLine(t, 'mini', d.usage?.mini)].filter(Boolean).map((line) => (
                <Text key={line} variant="caption" color="secondary">{line}</Text>
              ))}
            </View>
            <View style={{ gap: 8 }}>
              <Text variant="heading-3">{t('exam.forms')}</Text>
              {d.forms.length === 0 ? (
                <EmptyState title={t('exam.empty')} />
              ) : (
                d.forms.map((f) => (
                  <Card key={f.code} onPress={() => router.push(`/deneme/form/${f.code}`)} accessibilityLabel={f.title} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="title" style={{ flex: 1 }}>{f.title}</Text>
                      {f.locked ? <Lock size={18} color={colors.text.tertiary} /> : null}
                      {f.isRecommended ? <Text variant="label-s" color="accent">{t('exam.recommended')}</Text> : null}
                    </View>
                    <Text variant="body-s" color="secondary">
                      {[t(`enums.exam_form_type.${f.formType}`), t('exam.questions', { n: f.questionCount }), t('exam.minutes', { n: Math.round(f.durationSeconds / 60) })].join(' · ')}
                    </Text>
                    {f.activeSittingCode ? (
                      <Text variant="label-m" color="accent">{t('exam.inProgress')}</Text>
                    ) : f.taken ? (
                      <Text variant="caption" color="tertiary">{t('exam.taken', { score: f.bestScore ?? '-' })}</Text>
                    ) : null}
                  </Card>
                ))
              )}
            </View>
            {d.history?.length ? (
              <View>
                <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('exam.history')}</Text>
                {d.history.map((h, i) => (
                  <ListRow
                    key={h.code}
                    title={h.title}
                    subtitle={formatDate(h.submittedAt, language, { day: 'numeric', month: 'long' })}
                    value={`${h.score}`}
                    trailing={h.isPersonalBest ? <Badge tone="accent" dot /> : null}
                    divider={i < d.history.length - 1}
                    onPress={() => router.push(deepLinks.examResult(h.code))}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
