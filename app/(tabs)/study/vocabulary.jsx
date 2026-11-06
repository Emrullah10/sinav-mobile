import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Chip, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const PER_DAY = [5, 10, 20];

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
