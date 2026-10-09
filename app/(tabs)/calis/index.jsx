import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, BookOpen, Bookmark, Layers, Shuffle } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import { Badge, Card, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { PracticeSheet } from '@features/study/PracticeSheet';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

export default function StudyHome() {
  const { t } = useT();
  const { colors } = useTheme();
  const sheet = useRef(null);
  const query = useQuery({
    queryKey: queryKeys.learning.studyOverview(),
    queryFn: async () => unwrap(await api.learningStudyOverviewGet()),
  });
  return (
    <Screen
      header={<TopBar variant="large" title={t('study.title')} />}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            <Card elevation="e1" onPress={() => sheet.current?.present()} accessibilityLabel={t('study.mixed')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Shuffle size={28} color={colors.accent.default} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{t('study.mixed')}</Text>
                <Text variant="body-s" color="secondary">{t('study.mixedHint')}</Text>
              </View>
            </Card>

            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('study.shortcuts')}</Text>
              <ListRow
                leading={<Layers size={22} color={colors.text.secondary} />}
                title={t('study.vocab')}
                subtitle={t('study.vocabDue', { n: d.vocab.dueCards })}
                trailing={<Badge count={d.vocab.dueCards} tone="accent" />}
                onPress={() => router.push('/calis/kelimeler')}
                divider
              />
              <ListRow
                leading={<BookMarked size={22} color={colors.text.secondary} />}
                title={t('study.mistakes')}
                subtitle={t('study.mistakesDue', { open: d.mistakes.open, due: d.mistakes.due })}
                trailing={<Badge count={d.mistakes.due} />}
                onPress={() => router.push('/calis/hatalar')}
                divider
              />
              <ListRow
                leading={<Bookmark size={22} color={colors.text.secondary} />}
                title={t('study.bookmarks')}
                onPress={() => router.push('/calis/yer-imleri')}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text variant="heading-3">{t('study.types')}</Text>
              {d.types.map((ty) => (
                <Card key={ty.key} onPress={() => router.push(deepLinks.studyType(ty.key))} accessibilityLabel={ty.name} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={20} color={colors.accent.default} />
                    <Text variant="title" style={{ flex: 1 }}>{ty.name}</Text>
                    {ty.key === d.recommendedTypeKey ? (
                      <Text variant="label-s" color="accent">{t('study.recommended')}</Text>
                    ) : null}
                  </View>
                  <ProgressBar value={(ty.mastery || 0) / 100} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">{t(`study.level.${ty.level}`)}</Text>
                    <Text variant="caption" color="secondary">{t('study.mastery', { n: Math.round(ty.mastery || 0) })}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}
      </QueryBoundary>
      <PracticeSheet ref={sheet} />
    </Screen>
  );
}
