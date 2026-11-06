import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, BookOpen, Bookmark, Layers, Shuffle } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import { Badge, Banner, Card, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { report } from '@shared/monitoring/report';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { PracticeSheet } from '@features/study/PracticeSheet';
import { ContinueCard } from '@features/reading/ContinueCard';
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
  const current = useQuery({
    queryKey: queryKeys.learning.sessionsCurrent(),
    queryFn: async () => unwrap(await api.learningSessionsCurrentList()),
  });
  const unfinished = (current.data?.sessions || []).find((x) => ['practice', 'error_review', 'note_check'].includes(x.kind));
  const continueSession = async () => {
    if (!unfinished) return;
    try {
      if (unfinished.status === 'paused') await api.learningSessionResume(unfinished.code);
    } catch (err) {
      report(err, { where: 'study.continue' });
    }
    router.push(deepLinks.question(unfinished.code));
  };
  return (
    <Screen
      header={<TopBar variant="large" title={t('study.title')} />}
      onRefresh={() => { query.refetch(); current.refetch(); }}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            {unfinished ? <Banner tone="info" message={t('study.resume.body')} action={{ label: t('study.resume.action'), onPress: continueSession }} /> : null}
            <Card elevation="e1" onPress={() => sheet.current?.present()} accessibilityLabel={t('study.mixed')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Shuffle size={28} color={colors.accent.default} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{t('study.mixed')}</Text>
                <Text variant="body-s" color="secondary">{t('study.mixedHint')}</Text>
              </View>
            </Card>
            <ContinueCard />

            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('study.shortcuts')}</Text>
              <ListRow
                leading={<Layers size={22} color={colors.text.secondary} />}
                title={t('study.vocab')}
                subtitle={t('study.vocabDue', { n: d.vocab.dueCards })}
                trailing={<Badge count={d.vocab.dueCards} tone="accent" />}
                onPress={() => router.push('/study/vocabulary')}
                divider
              />
              <ListRow
                leading={<BookMarked size={22} color={colors.text.secondary} />}
                title={t('study.mistakes')}
                subtitle={t('study.mistakesDue', { open: d.mistakes.open, due: d.mistakes.due })}
                trailing={<Badge count={d.mistakes.due} />}
                onPress={() => router.push('/study/mistakes')}
                divider
              />
              <ListRow
                leading={<Bookmark size={22} color={colors.text.secondary} />}
                title={t('study.bookmarks')}
                onPress={() => router.push('/study/bookmarks')}
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
