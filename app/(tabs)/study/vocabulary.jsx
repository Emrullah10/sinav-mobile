import { router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Button, Card, Chip, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const PER_DAY = [5, 10, 20];

/** Dokun-çeviriden kaydedilen kelimeler (en yeni önce, sayfa sayfa); dokununca kelimenin ayrıntısı. */
function SavedWords() {
  const { t } = useT();
  const { colors } = useTheme();
  const q = useInfiniteQuery({
    queryKey: [...queryKeys.learning.vocabMyWords(), 'list'],
    queryFn: async ({ pageParam }) => unwrap(await api.learningVocabMyWords({ limit: 30, before: pageParam || undefined })),
    initialPageParam: null,
    getNextPageParam: (last) => last?.nextBefore || undefined,
  });
  const items = q.data?.pages.flatMap((p) => p?.items || []) || [];
  const total = q.data?.pages[0]?.total ?? 0;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="heading-3">{t('vocab.saved.title')}</Text>
        {total > 0 ? <Text variant="caption" color="tertiary">{t('vocab.saved.count', { n: total })}</Text> : null}
      </View>
      {q.isPending ? null : !items.length ? (
        <Text variant="body-s" color="secondary">{t('vocab.saved.empty')}</Text>
      ) : (
        <>
          <Text variant="body-s" color="secondary">{t('vocab.saved.body')}</Text>
          <Card style={{ paddingVertical: 4 }}>
            {items.map((w, i) => (
              <Pressable
                key={w.cardCode}
                accessibilityRole="button"
                accessibilityLabel={`${w.headword}${w.meaning ? `, ${w.meaning}` : ''}`}
                onPress={() => router.push(deepLinks.vocabWord(w.itemCode))}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border.default,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text variant="body-m" style={{ flex: 1 }} numberOfLines={2}>
                  <Text variant="label-l">{w.headword}</Text>
                  {w.meaning ? <Text variant="body-m" color="secondary">{` — ${w.meaning}`}</Text> : null}
                </Text>
                {w.state === 'new' ? <Chip size="sm" label={t('vocab.saved.new')} /> : null}
              </Pressable>
            ))}
          </Card>
          {q.hasNextPage ? <Button title={t('vocab.saved.more')} variant="secondary" size="md" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} /> : null}
        </>
      )}
    </View>
  );
}

export default function VocabHome() {
  const { t } = useT();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.learning.vocabOverview(),
    queryFn: async () => unwrap(await api.learningVocabOverviewGet()),
  });
  const subscribe = useMutation({
    mutationFn: async ({ key, body }) => unwrap(await api.learningVocabDeckSubscribe(key, body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.learning.vocabOverview() }),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  return (
    <Screen
      header={<TopBar title={t('vocab.title')} onBack={() => router.back()} />}
      edges={['bottom']}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            <Card elevation="e1" style={{ gap: 8 }}>
              <Text variant="heading-2">{t('vocab.dueNow', { n: d.totals.due })}</Text>
              <Text variant="body-s" color="secondary">{t('vocab.newToday', { n: d.totals.newAvailableToday })}</Text>
              <Button
                title={t('vocab.startReview')}
                disabled={d.totals.due + d.totals.newAvailableToday === 0}
                onPress={() => router.push(deepLinks.vocabReview)}
              />
              {d.totals.due + d.totals.newAvailableToday === 0 ? (
                <Text variant="caption" color="tertiary">{t('vocab.nothingDue')}</Text>
              ) : null}
            </Card>
            <SavedWords />
            <Text variant="heading-3">{t('vocab.decks')}</Text>
            {d.decks.map((deck) => (
              <Card key={deck.key} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="title" style={{ flex: 1 }}>{deck.name}</Text>
                  {deck.locked ? <Lock size={18} color={colors.text.tertiary} /> : null}
                </View>
                <Text variant="body-s" color="secondary">{deck.description}</Text>
                <Text variant="caption" color="tertiary">
                  {`${t('vocab.deck.words', { n: deck.totalWords })} · ${t('vocab.deck.progress', { started: deck.started, mature: deck.mature, due: deck.due })}`}
                </Text>
                {deck.locked ? (
                  <Button title={t('vocab.deck.locked')} variant="secondary" size="md" fullWidth={false} onPress={() => router.push('/premium')} />
                ) : (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {PER_DAY.map((n) => (
                        <Chip
                          key={n}
                          size="sm"
                          label={t('vocab.deck.newPerDay', { n })}
                          selected={deck.subscribed && deck.newPerDay === n}
                          onPress={() => subscribe.mutate({ key: deck.key, body: { newPerDay: n, isActive: true } })}
                        />
                      ))}
                      {deck.subscribed ? (
                        <Chip size="sm" label={t('common.off')} onPress={() => subscribe.mutate({ key: deck.key, body: { isActive: false } })} />
                      ) : null}
                    </View>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
