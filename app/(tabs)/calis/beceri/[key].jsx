import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { View } from 'react-native';
import { Button, ListRow, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { PracticeSheet } from '@features/study/PracticeSheet';
import { useT } from '@shared/translation/useT';

export default function SkillScreen() {
  const { key } = useLocalSearchParams();
  const { t } = useT();
  const sheet = useRef(null);
  const query = useQuery({
    queryKey: queryKeys.learning.skill(key),
    queryFn: async () => unwrap(await api.learningStudySkillGet(key)),
  });
  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title={query.data?.skill.name || ''} />}
      edges={['bottom']}
      footer={<Button title={t('study.type.practice')} onPress={() => sheet.current?.present()} disabled={!query.data} />}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            <Text variant="heading-1">{d.skill.name}</Text>
            {d.skill.description ? <Text variant="body-m" color="secondary">{d.skill.description}</Text> : null}
            <Text variant="caption" color="tertiary">
              {`${t('study.mastery', { n: Math.round(d.mastery || 0) })} · ${t('study.type.available', { n: d.availableQuestions })}`}
            </Text>
            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('study.skill.notes')}</Text>
              {d.notes?.length ? (
                d.notes.map((n, i) => (
                  <ListRow
                    key={n.itemCode}
                    title={n.title}
                    subtitle={[n.summary, t('study.skill.readingMinutes', { n: Math.max(1, Math.round((n.readingSeconds || 60) / 60)) })].filter(Boolean).join(' · ')}
                    value={n.locked ? t('study.skill.locked') : undefined}
                    divider={i < d.notes.length - 1}
                    onPress={() => router.push(deepLinks.note(n.itemCode))}
                  />
                ))
              ) : (
                <Text variant="body-m" color="secondary">{t('study.skill.noNotes')}</Text>
              )}
            </View>
          </View>
        )}
      </QueryBoundary>
      <PracticeSheet ref={sheet} skillKeys={[key]} />
    </Screen>
  );
}
