import { router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, EmptyState, ErrorState, Screen, Sheet, Skeleton, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorKind, errorText, formatDate, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

const FILTERS = [
  { key: 'open', params: { status: 'open', sort: 'recent' }, label: 'mistakes.filter.open' },
  { key: 'due', params: { status: 'open', due: true, sort: 'due' }, label: 'mistakes.filter.due' },
  { key: 'resolved', params: { status: 'resolved', sort: 'recent' }, label: 'mistakes.filter.resolved' },
];
const PAGE_SIZE = 20;
const TYPES = ['knowledge_gap', 'attention', 'time', 'trap', 'vocabulary'];

export default function Mistakes() {
  const { t, language } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const sheet = useRef(null);
  const [filter, setFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const f = FILTERS.find((x) => x.key === filter);

  const query = useInfiniteQuery({
    queryKey: queryKeys.learning.mistakes({ ...f.params, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => unwrap(await api.learningMistakesList({ ...f.params, page: pageParam, pageSize: PAGE_SIZE })),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.items) || [];
  const first = query.data?.pages[0];

  const update = useMutation({
    mutationFn: async ({ code, body }) => unwrap(await api.learningMistakeUpdate(code, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning', 'mistakes'] });
      qc.invalidateQueries({ queryKey: queryKeys.learning.studyOverview() });
      sheet.current?.dismiss();
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });

  const startReview = useMutation({
    mutationFn: async () => unwrap(await api.learningMistakeReviewStart({ limit: 10 })),
    onSuccess: (res) => {
      if (res.empty || !res.code) toast.show({ message: t('mistakes.reviewEmpty') });
      else router.push(deepLinks.question(res.code));
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });

  return (
    <Screen
      header={<TopBar title={t('mistakes.title')} onBack={() => router.back()} />}
      edges={['bottom']}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending && !query.isFetchingNextPage}
    >
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((x) => (
            <Chip
              key={x.key}
              label={`${t(x.label)}${first?.counts ? ` (${first.counts[x.key] ?? 0})` : ''}`}
              selected={filter === x.key}
              onPress={() => setFilter(x.key)}
            />
          ))}
        </View>
        {first?.counts?.due > 0 ? (
          <Button title={t('mistakes.review')} onPress={() => startReview.mutate()} loading={startReview.isPending} />
        ) : null}
        {query.isPending ? (
          <View style={{ gap: 8 }}>
            <Skeleton height={88} />
            <Skeleton height={88} />
          </View>
        ) : query.isError ? (
          <ErrorState kind={errorKind(query.error)} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={t('mistakes.empty')} />
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((m) => (
              <Card
                key={m.code}
                onPress={() => {
                  setSelected(m);
                  sheet.current?.present();
                }}
                accessibilityLabel={m.stemPreview}
                style={{ gap: 6 }}
              >
                <Text variant="label-s" color="tertiary">{m.type?.name}</Text>
                <Text variant="body-m" numberOfLines={3}>{m.stemPreview}</Text>
                <Text variant="caption" color="secondary">
                  {[
                    t('mistakes.wrongCount', { n: m.wrongCount }),
                    m.correctStreak ? t('mistakes.streak', { n: m.correctStreak }) : null,
                    m.mistakeType ? t(`enums.mistake_type.${m.mistakeType}`) : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
                {m.status === 'open' ? (
                  <Text variant="caption" color={m.isDue ? 'warning' : 'tertiary'}>
                    {m.isDue ? t('mistakes.due') : t('mistakes.next', { date: formatDate(m.nextReviewAt, language) })}
                  </Text>
                ) : null}
              </Card>
            ))}
            {query.hasNextPage ? (
              <Button title={t('mistakes.more')} variant="secondary" loading={query.isFetchingNextPage} onPress={() => query.fetchNextPage()} />
            ) : null}
          </View>
        )}
      </View>

      <Sheet ref={sheet} title={t('mistakes.type')} onDismiss={() => setSelected(null)}>
        {selected ? (
          <View style={{ gap: 16 }}>
            <Text variant="body-m" numberOfLines={4}>{selected.stemPreview}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((ty) => (
                <Chip
                  key={ty}
                  label={t(`enums.mistake_type.${ty}`)}
                  selected={selected.mistakeType === ty}
                  onPress={() => {
                    setSelected({ ...selected, mistakeType: ty });
                    update.mutate({ code: selected.code, body: { mistakeType: ty } });
                  }}
                />
              ))}
            </View>
            {selected.status === 'open' ? (
              <>
                <Button title={t('mistakes.markResolved')} variant="secondary" onPress={() => update.mutate({ code: selected.code, body: { status: 'resolved' } })} />
                <Button title={t('mistakes.archive')} variant="tertiary" onPress={() => update.mutate({ code: selected.code, body: { status: 'archived' } })} />
              </>
            ) : (
              <Button title={t('mistakes.reopen')} variant="secondary" onPress={() => update.mutate({ code: selected.code, body: { status: 'open' } })} />
            )}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
