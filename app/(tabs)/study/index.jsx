import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, Bookmark, Layers, Shuffle } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import { Badge, Banner, Card, IconTile, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { report } from '@shared/monitoring/report';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { FEATURE_HUE, typeHue } from '@shared/vendor/domain/index.js';
import { typeIcon } from '@shared/ui/studyIcons';
import { deepLinks } from '@shared/navigation/deepLinks';
import { PracticeSheet } from '@features/study/PracticeSheet';
import { ContinueCard } from '@features/reading/ContinueCard';
import { useT } from '@shared/translation/useT';

export default function StudyHome() {
  const { t } = useT();
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
              <IconTile icon={Shuffle} hue={FEATURE_HUE.practice} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{t('study.mixed')}</Text>
                <Text variant="body-s" color="secondary">{t('study.mixedHint')}</Text>
              </View>
            </Card>
            <ContinueCard />

            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('study.shortcuts')}</Text>
              <ListRow
                leading={<IconTile icon={Layers} hue={FEATURE_HUE.vocab} size={36} />}
                title={t('study.vocab')}
                subtitle={t('study.vocabDue', { n: d.vocab.dueCards })}
                trailing={<Badge count={d.vocab.dueCards} tone="accent" />}
                onPress={() => router.push('/study/vocabulary')}
                divider
              />
              <ListRow
                leading={<IconTile icon={BookMarked} hue={FEATURE_HUE.mistakes} size={36} />}
                title={t('study.mistakes')}
                subtitle={t('study.mistakesDue', { open: d.mistakes.open, due: d.mistakes.due })}
                trailing={<Badge count={d.mistakes.due} />}
                onPress={() => router.push('/study/mistakes')}
                divider
              />
              <ListRow
                leading={<IconTile icon={Bookmark} hue={FEATURE_HUE.bookmarks} size={36} />}
                title={t('study.bookmarks')}
                onPress={() => router.push('/study/bookmarks')}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text variant="heading-3">{t('study.types')}</Text>
              {d.types.map((ty) => (
                <Card key={ty.key} onPress={() => router.push(deepLinks.studyType(ty.key))} accessibilityLabel={ty.name} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <IconTile icon={typeIcon(ty.key)} hue={typeHue(ty.key)} size={36} />
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
