import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { Button, Card, Chip, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { TapText } from '@features/lexicon/TapText';

const Chips = ({ title, items }) =>
  items?.length ? (
    <View style={{ gap: 6 }}>
      <Text variant="overline" color="tertiary">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((x) => (
          <Chip key={x} label={x} />
        ))}
      </View>
    </View>
  ) : null;

/** Kelime ayrıntısı (içerik + kart durumu); kelimeyi kendi kartlarına ekleyebilir. */
export default function VocabWord() {
  const { id } = useLocalSearchParams();
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const word = useQuery({
    queryKey: queryKeys.content.vocab(id),
    queryFn: async () => unwrap(await api.contentVocabGet(id)),
  });
  const card = useQuery({
    queryKey: queryKeys.learning.vocabCardByItem(id),
    queryFn: async () => unwrap(await api.learningVocabCardByItemGet(id)),
  });
  const add = useMutation({
    mutationFn: async () => unwrap(await api.learningVocabCardAdd(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabCardByItem(id) });
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabOverview() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
      toast.show({ message: t('vocab.word.added'), tone: 'success' });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const has = card.data?.card;
  return (
    <Screen
      header={
        <TopBar
          title={t('vocab.word.title')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/study/vocabulary'))}
        />
      }
      edges={['bottom']}
    >
      <QueryBoundary query={word}>
        {(d) => {
          const w = d.entry || d;
          return (
            <View style={{ gap: 16 }}>
              <Card elevation="e1" style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
                <Text variant="display-m" align="center">
                  {w.headword}
                </Text>
                <Text variant="body-m" color="secondary">
                  {[
                    w.partOfSpeech,
                    w.pronunciationIpa
                      ? `/${String(w.pronunciationIpa).replace(/^\/|\/$/g, '')}/`
                      : null,
                  ]
                    .filter(Boolean)
                    .join('  ')}
                </Text>
              </Card>
              {has ? (
                <Chip label={t('vocab.word.hasCard')} />
              ) : (
                <Button
                  title={t('vocab.word.addCard')}
                  loading={add.isPending}
                  disabled={card.isPending}
                  onPress={() => add.mutate()}
                />
              )}
              <View style={{ gap: 8 }}>
                {(w.meanings || []).map((m, i) => (
                  <Text key={i} variant="title">
                    {m.note ? `${m.tr} (${m.note})` : m.tr}
                  </Text>
                ))}
              </View>
              {w.examples?.length ? (
                <View style={{ gap: 6 }}>
                  <Text variant="overline" color="tertiary">
                    {t('vocab.review.examples')}
                  </Text>
                  {w.examples.map((ex, i) => (
                    <View key={i}>
                      <TapText variant="reading-m" italic text={ex.en} />
                      <Text variant="body-s" color="secondary">
                        {ex.tr}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Chips title={t('vocab.review.collocations')} items={w.collocations} />
              <Chips title={t('vocab.review.synonyms')} items={w.synonyms} />
              <Chips title={t('vocab.word.antonyms')} items={w.antonyms} />
              <Chips title={t('vocab.word.confusables')} items={w.confusables} />
            </View>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
