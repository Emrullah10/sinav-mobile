import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { View } from 'react-native';
import { Button, Card, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { PracticeSheet } from '@features/study/PracticeSheet';
import { useT } from '@shared/translation/useT';

export default function QuestionTypeScreen() {
  const { type } = useLocalSearchParams();
  const { t } = useT();
  const sheet = useRef(null);
  const query = useQuery({
    queryKey: queryKeys.learning.questionType(type),
    queryFn: async () => unwrap(await api.learningStudyQuestionTypeGet(type)),
  });
  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title={query.data?.type.shortName || query.data?.type.name || ''} />}
      edges={['bottom']}
      footer={<Button title={t('study.type.practice')} onPress={() => sheet.current?.present()} disabled={!query.data} />}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            <Text variant="heading-1">{d.type.name}</Text>
            <Text variant="body-m" color="secondary">{d.type.description}</Text>
            <Card style={{ gap: 8 }}>
              <ProgressBar value={(d.mastery || 0) / 100} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="label-m">{t(`study.level.${d.level}`)}</Text>
                <Text variant="label-m" color="secondary">{t('study.mastery', { n: Math.round(d.mastery || 0) })}</Text>
              </View>
              <Text variant="caption" color="tertiary">
                {[t('study.type.available', { n: d.availableQuestions }), t('study.type.perQuestion', { n: d.type.targetSecondsPerQuestion })].join(' · ')}
              </Text>
            </Card>
            {d.strategyNote ? (
              <View>
                <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('study.type.strategy')}</Text>
                <ListRow
                  title={d.strategyNote.title}
                  subtitle={d.strategyNote.summary}
                  value={d.strategyNote.accessTier === 'premium' ? t('study.skill.locked') : undefined}
                  onPress={() => router.push(deepLinks.note(d.strategyNote.itemCode))}
                />
              </View>
            ) : null}
            {d.openMistakes > 0 ? (
              <ListRow title={t('study.type.openMistakes', { n: d.openMistakes })} onPress={() => router.push('/calis/hatalar')} />
            ) : null}
            {d.skills?.length ? (
              <View>
                <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('study.type.skills')}</Text>
                {d.skills.map((s, i) => (
                  <ListRow
                    key={s.key}
                    title={s.name}
                    subtitle={t(`study.level.${s.level}`)}
                    value={`%${Math.round(s.mastery || 0)}`}
                    divider={i < d.skills.length - 1}
                    onPress={() => router.push(`/calis/beceri/${s.key}`)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </QueryBoundary>
      <PracticeSheet ref={sheet} questionTypeKeys={[type]} />
    </Screen>
  );
}
