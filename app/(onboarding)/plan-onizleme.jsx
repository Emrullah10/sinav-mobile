import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Banner, Button, Card, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { formatDate, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

export default function PlanPreview() {
  const { t, language } = useT();
  const isGuest = useAuthStore((s) => s.isGuest);
  const query = useQuery({
    queryKey: queryKeys.learning.planPreview(7),
    queryFn: async () => unwrap(await api.learningPlanPreviewGet(7)),
  });
  return (
    <Screen
      header={<TopBar title={t('onb.step', { n: 3, total: 3 })} />}
      edges={['bottom']}
      footer={
        isGuest ? (
          <View style={{ gap: 8 }}>
            <Button title={t('plan.preview.signUp')} onPress={() => router.push('/kayit')} />
            <Button title={t('plan.preview.signIn')} variant="tertiary" onPress={() => router.push('/giris')} />
          </View>
        ) : (
          <Button title={t('plan.preview.go')} onPress={() => router.replace(deepLinks.today)} />
        )
      }
    >
      <View style={{ gap: 4, marginBottom: 16 }}>
        <Text variant="display-m" accessibilityRole="header">
          {t('plan.preview.title')}
        </Text>
        <Text variant="body-l" color="secondary">
          {t('plan.preview.subtitle')}
        </Text>
      </View>
      {isGuest ? (
        <Banner tone="info" title={t('plan.preview.save')} message={t('plan.preview.saveBody')} style={{ marginBottom: 16 }} />
      ) : null}
      <QueryBoundary query={query}>
        {(plan) => (
          <View style={{ gap: 8 }}>
            {plan.days.map((d) => (
              <Card key={d.code} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="title">
                    {formatDate(d.date, language, { weekday: 'long', day: 'numeric', month: 'short' })}
                  </Text>
                  <Text variant="label-m" color="secondary">
                    {t('plan.preview.minutes', { n: d.plannedMinutes })}
                  </Text>
                </View>
                {d.tasks.map((task) => (
                  <Text key={task.code} variant="body-m" color="secondary">
                    {`${t(`enums.plan_task_kind.${task.kind}`)}${task.questionType ? ` · ${task.questionType.name}` : ''}`}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
