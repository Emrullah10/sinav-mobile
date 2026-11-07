import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bookmark, Layers, Lock } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Chip, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const PER_DAY = [5, 10, 20];

/** Desteler arasında "Kaydettiğin kelimeler" kartı: sayılar + son eklenenler + "Tümünü gör" (tam liste ayrı ekranda). */
function SavedWordsCard() {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const q = useQuery({
    queryKey: [...queryKeys.learning.vocabMyWords(), 'preview'],
    queryFn: async () => unwrap(await api.learningVocabMyWords({ limit: 6 })),
  });
  const d = q.data;
  const total = d?.total || 0;
  const c = d?.counts || {};
  const parts = [
    c.due ? t('vocab.saved.n.due', { n: c.due }) : null,
    c.new ? t('vocab.saved.n.new', { n: c.new }) : null,
    c.learning ? t('vocab.saved.n.learning', { n: c.learning }) : null,
    c.review ? t('vocab.saved.n.review', { n: c.review }) : null,
  ].filter(Boolean);
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent['subtle-bg'] }}>
          <Bookmark size={18} color={colors.accent.default} />
        </View>
        <Text variant="title" style={{ flex: 1 }}>{t('vocab.saved.title')}</Text>
        {total > 0 ? <Text variant="caption" color="secondary">{t('vocab.saved.count', { n: total })}</Text> : null}
      </View>
      {q.isPending ? null : !total ? (
        <>
          <Text variant="body-s" color="secondary">{t('vocab.saved.empty')}</Text>
          <Button title={t('vocab.saved.toLibrary')} variant="secondary" size="md" fullWidth={false} onPress={() => router.push(deepLinks.library)} />
        </>
      ) : (
        <>
          <Text variant="body-s" color="secondary">{t('vocab.saved.short')}</Text>
          {parts.length ? <Text variant="caption" color="tertiary">{parts.join(' · ')}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {d.items.map((w) => (
              <View key={w.cardCode} style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.bg.pressed }}>
                <Text variant="label-m" numberOfLines={1}>{w.headword}</Text>
              </View>
            ))}
            {total > d.items.length ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border.strong }}>
                <Text variant="label-m" color="secondary">{`+${total - d.items.length}`}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button title={t('vocab.saved.study')} size="md" fullWidth={false} leftIcon={Layers} onPress={() => router.push({ pathname: deepLinks.vocabReview, params: { source: 'saved' } })} />
            <Button title={t('vocab.saved.all')} variant="secondary" size="md" fullWidth={false} rightIcon={ArrowRight} onPress={() => router.push('/study/saved-words')} />
          </View>
        </>
      )}
    </Card>
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
            <Text variant="heading-3">{t('vocab.decks')}</Text>
            <SavedWordsCard />
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
