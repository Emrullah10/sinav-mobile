import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, GraduationCap, Languages, Plus, Volume2 } from 'lucide-react-native';
import { forwardRef } from 'react';
import { View } from 'react-native';
import { Button, Chip, IconButton, Sheet, Skeleton, Text } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { lexiconForm, normalizeSentence } from '@shared/vendor/domain/lexicon-text.js';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

// UNAVAILABLE da yeniden denenmez: her deneme yeni bir AI çağrısı (birkaç sn + ücret); kullanıcıda "Tekrar dene" düğmesi var.
const NO_RETRY = ['CONTENT_LEXICON_LIMIT', 'CONTENT_LEXICON_WORD_INVALID', 'CONTENT_LEXICON_SENTENCE_INVALID', 'CONTENT_LEXICON_UNAVAILABLE'];
const retry = (n, e) => n < 1 && !NO_RETRY.includes(apiErrorCode(e));
const speak = (text) => {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate: 0.9 });
};

const sentenceKey = (text) => queryKeys.content.lexiconSentence(normalizeSentence(text));

/** Hata satırı + yeniden dene (sayfa içinde; toast sayfanın altında kalır). */
function Failure({ error, onRetry }) {
  const { t } = useT();
  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text variant="body-m" color="danger">{errorText(t, error)}</Text>
      {apiErrorCode(error) !== 'CONTENT_LEXICON_LIMIT' ? (
        <Button title={t('lex.retry')} variant="secondary" size="md" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}

function useAskTutor(onClose) {
  return useMutation({
    mutationFn: async ({ mode, text, onAsk }) => {
      if (onAsk) return { local: true, onAsk, text };
      return { conv: unwrap(await api.tutorConversationCreate({ mode })), text };
    },
    onSuccess: (r) => {
      onClose();
      if (r.local) r.onAsk(r.text);
      else router.push({ pathname: `/tutor/${r.conv.code}`, params: { starter: r.text } });
    },
  });
}

function WordPanel({ req, onSwitch, onClose }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const form = lexiconForm(req.word);
  const q = useQuery({
    queryKey: queryKeys.content.lexiconWord(form),
    queryFn: async () => unwrap(await api.contentLexiconWord(req.word)),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry,
  });
  const entry = q.data;
  const card = useQuery({
    queryKey: queryKeys.learning.vocabCardByItem(entry?.itemCode),
    queryFn: async () => unwrap(await api.learningVocabCardByItemGet(entry.itemCode)),
    enabled: Boolean(entry?.itemCode),
  });
  const add = useMutation({
    mutationFn: async () => {
      const itemCode = entry.itemCode || unwrap(await api.contentLexiconWordItem(req.word)).itemCode;
      await api.learningVocabCardAdd(itemCode);
      return itemCode;
    },
    onSuccess: (itemCode) => {
      haptics.success();
      qc.setQueryData(queryKeys.content.lexiconWord(form), (old) => (old ? { ...old, itemCode } : old));
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabCardByItem(itemCode) });
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabOverview() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabMyWords() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
    },
  });
  const ask = useAskTutor(onClose);
  const sentenceText = req.sentences?.[req.index] || null;

  if (q.isPending) {
    return (
      <View style={{ gap: 10 }} accessibilityLabel={t('lex.loading')}>
        <Text variant="heading-2">{req.word}</Text>
        <Skeleton height={18} width="60%" />
        <Skeleton height={18} width="80%" />
        <Skeleton height={44} />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View style={{ gap: 4 }}>
        <Text variant="heading-2">{req.word}</Text>
        <Failure error={q.error} onRetry={() => q.refetch()} />
      </View>
    );
  }
  const inCards = Boolean(card.data?.card) || add.isSuccess;
  const headword = entry.lemma || entry.form;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading-2" accessibilityRole="header">{headword}</Text>
          <Text variant="body-s" color="secondary">
            {[entry.partOfSpeech ? t(`enums.part_of_speech.${entry.partOfSpeech}`, { defaultValue: entry.partOfSpeech }) : null, entry.ipa].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
        <IconButton icon={Volume2} variant="tonal" accessibilityLabel={t('lex.listen')} onPress={() => speak(headword)} />
      </View>
      {entry.formNote ? <Text variant="body-s" color="tertiary">{entry.formNote}</Text> : null}

      {entry.isWord === false ? (
        <Text variant="body-m" color="secondary">{entry.formNote ? null : t('lex.notWord')}</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {entry.meanings.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <Text variant="label-l" color="accent" style={{ minWidth: 18 }}>{`${i + 1}.`}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="body-l">{m.tr}</Text>
                {m.note ? <Text variant="body-s" color="secondary">{m.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {entry.examples?.[0] ? (
        <View style={{ gap: 2, padding: 12, borderRadius: radius.md, backgroundColor: colors.bg.canvas }}>
          <Text variant="reading-s" italic>{entry.examples[0].en}</Text>
          {entry.examples[0].tr ? <Text variant="body-s" color="secondary">{entry.examples[0].tr}</Text> : null}
        </View>
      ) : null}
      {entry.synonyms?.length ? (
        <Text variant="body-s" color="secondary">{`${t('lex.synonyms')}: ${entry.synonyms.slice(0, 4).join(', ')}`}</Text>
      ) : null}

      {add.isError ? <Text variant="body-s" color="danger">{errorText(t, add.error)}</Text> : null}
      {ask.isError ? <Text variant="body-s" color="danger">{errorText(t, ask.error)}</Text> : null}
      <View style={{ gap: 8 }}>
        {entry.isWord !== false ? (
          inCards ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Chip icon={Check} label={t('lex.added')} selected />
              {entry.itemCode || add.data ? (
                <Button
                  title={t('lex.details')}
                  variant="tertiary"
                  size="md"
                  fullWidth={false}
                  onPress={() => {
                    onClose();
                    router.push(`/vocabulary/${entry.itemCode || add.data}`);
                  }}
                />
              ) : null}
              <Button
                title={t('lex.myWords')}
                variant="tertiary"
                size="md"
                fullWidth={false}
                onPress={() => {
                  onClose();
                  router.push('/study/saved-words');
                }}
              />
            </View>
          ) : (
            <Button title={t('lex.add')} leftIcon={Plus} loading={add.isPending || card.isFetching} onPress={() => add.mutate()} />
          )
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {req.allowSentence && sentenceText ? (
            <Button
              title={t('lex.translateSentence')}
              leftIcon={Languages}
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
              onPress={() => onSwitch({ ...req, kind: 'sentence' })}
            />
          ) : null}
          <Button
            title={t('lex.askTutor')}
            leftIcon={GraduationCap}
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            loading={ask.isPending}
            onPress={() =>
              ask.mutate({
                mode: 'explain',
                onAsk: req.onAsk,
                text: sentenceText ? t('lex.askTutor.word', { word: headword, sentence: sentenceText }) : t('lex.askTutor.wordOnly', { word: headword }),
              })
            }
          />
        </View>
      </View>
      {entry.source === 'ai' ? <Text variant="caption" color="tertiary">{t('lex.aiNote')}</Text> : null}
    </View>
  );
}

function SentencePanel({ req, onClose }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const text = req.sentences[req.index];
  const q = useQuery({
    queryKey: sentenceKey(text),
    queryFn: async () => {
      const r = unwrap(await api.contentLexiconSentence(req.sentences, req.index, req.bookCode));
      for (const x of r.translations) if (x.index !== req.index) qc.setQueryData(sentenceKey(req.sentences[x.index]), x.text);
      return r.translation;
    },
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry,
  });
  const ask = useAskTutor(onClose);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Text variant="reading-m" style={{ flex: 1 }}>{text}</Text>
        <IconButton icon={Volume2} variant="tonal" accessibilityLabel={t('lex.listen')} onPress={() => speak(text)} />
      </View>
      <View style={{ padding: 14, borderRadius: radius.md, backgroundColor: colors.accent['subtle-bg'], minHeight: 56, justifyContent: 'center' }}>
        {q.isPending ? (
          <View style={{ gap: 8 }} accessibilityLabel={t('lex.translating')}>
            <Skeleton height={16} />
            <Skeleton height={16} width="70%" />
          </View>
        ) : q.isError ? (
          <Failure error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <Text variant="body-l" style={{ color: colors.accent['subtle-fg'] }} selectable>{q.data}</Text>
        )}
      </View>
      {ask.isError ? <Text variant="body-s" color="danger">{errorText(t, ask.error)}</Text> : null}
      <Button
        title={t('lex.askTutor')}
        leftIcon={GraduationCap}
        variant="secondary"
        size="md"
        loading={ask.isPending}
        onPress={() => ask.mutate({ mode: 'sentence_xray', onAsk: req.onAsk, text: t('lex.askTutor.sentence', { sentence: text }) })}
      />
      <Text variant="caption" color="tertiary">{t('lex.aiNote')}</Text>
    </View>
  );
}

/** Dokun-çevir alt sayfası: kelime (sözlük + kartlara ekle) ya da cümle (çeviri). */
export const LexiconSheet = forwardRef(function LexiconSheet({ req, onSwitch, onClose, onDismiss }, ref) {
  const { t } = useT();
  return (
    <Sheet ref={ref} title={req?.kind === 'sentence' ? t('lex.sentence.title') : undefined} onDismiss={onDismiss}>
      {req?.kind === 'word' ? (
        <WordPanel key={`w:${req.word}`} req={req} onSwitch={onSwitch} onClose={onClose} />
      ) : req?.kind === 'sentence' ? (
        <SentencePanel key={`s:${req.sentences[req.index]}`} req={req} onClose={onClose} />
      ) : null}
    </Sheet>
  );
});
