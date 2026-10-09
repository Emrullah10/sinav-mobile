import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Undo2, Layers } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, EmptyState, ErrorState, IconButton, Screen, Skeleton, Text, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorKind, errorText, newClientRef, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useHaptics } from '@hooks/useHaptics';
import { useHeartbeat } from '@hooks/useHeartbeat';
import { useItemTimer } from '@hooks/useItemTimer';
import { useT } from '@shared/translation/useT';

const RATINGS = ['again', 'hard', 'good', 'easy'];

const intervalLabel = (t, iv) => {
  if (!iv) return '';
  if (iv.minutes != null) return t('vocab.interval.minutes', { n: iv.minutes });
  return t('vocab.interval.days', { n: iv.days });
};

export default function VocabReview() {
  const params = useLocalSearchParams();
  const { t } = useT();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const [state, setState] = useState({ phase: 'loading' }); // loading | empty | card | summary | error
  const [session, setSession] = useState(null);
  const [card, setCard] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastRated, setLastRated] = useState(false);
  const clientRef = useRef(newClientRef());
  const timer = useItemTimer(card?.code);
  useHeartbeat(null, state.phase === 'card');

  const refreshLists = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.learning.vocabOverview() });
    qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
    qc.invalidateQueries({ queryKey: queryKeys.learning.studyOverview() });
  }, [qc]);

  const complete = useCallback(
    async (code) => {
      try {
        const res = unwrap(await api.learningVocabReviewComplete(code));
        refreshLists();
        setState({ phase: 'summary', summary: res.summary });
      } catch (e) {
        setState({ phase: 'error', error: e });
      }
    },
    [refreshLists],
  );

  const showCard = useCallback((c) => {
    clientRef.current = newClientRef();
    setRevealed(false);
    setLastRated(false);
    setCard(c);
    setState({ phase: 'card' });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let code = params.session ? Number(params.session) : null;
        if (!code) {
          const res = unwrap(await api.learningVocabReviewStart({ limit: 20 }));
          if (res.empty || !res.session) return alive && setState({ phase: 'empty' });
          code = res.session.code;
        }
        if (!alive) return;
        setSession({ code });
        const next = unwrap(await api.learningVocabReviewNext(code));
        if (!alive) return;
        setSession(next.session || { code });
        if (next.done || !next.card) await complete(code);
        else showCard(next.card);
      } catch (e) {
        if (alive) setState({ phase: 'error', error: e });
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.session, complete, showCard]);

  const rate = async (rating) => {
    if (!card || !session) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = unwrap(
        await api.learningVocabCardReview(card.code, {
          rating,
          durationMs: timer.elapsed(),
          sessionCode: session.code,
          clientRef: clientRef.current,
        }),
      );
      haptics.tap();
      if (res.session) setSession(res.session);
      if (res.next) {
        showCard(res.next);
        setLastRated(true);
      } else await complete(session.code);
    } catch (e) {
      if (apiErrorCode(e) === 'QUOTA_EXCEEDED') {
        setMessage(t('vocab.quota'));
        await complete(session.code);
      } else setMessage(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const res = unwrap(await api.learningVocabReviewUndo(session.code));
      if (res.session) setSession(res.session);
      showCard(res.card);
      setLastRated(false);
    } catch (e) {
      setMessage(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const close = () => router.back();

  if (state.phase === 'error') {
    return (
      <Screen header={<TopBar variant="focus" onClose={close} />}>
        <ErrorState kind={errorKind(state.error)} onRetry={() => router.replace('/kelimeler/tekrar')} />
      </Screen>
    );
  }
  if (state.phase === 'empty') {
    return (
      <Screen header={<TopBar variant="focus" onClose={close} />} edges={['bottom']} footer={<Button title={t('common.back')} onPress={close} />}>
        <EmptyState icon={Layers} title={t('vocab.nothingDue')} />
      </Screen>
    );
  }
  if (state.phase === 'summary') {
    const s = state.summary;
    return (
      <Screen header={<TopBar variant="focus" onClose={close} />} edges={['bottom']} footer={<Button title={t('vocab.summary.done')} onPress={close} />}>
        <View style={{ gap: 16 }}>
          <Text variant="display-m" accessibilityRole="header">{t('vocab.summary.title')}</Text>
          {message ? <Banner tone="warning" message={message} /> : null}
          <Card style={{ gap: 6 }}>
            <Text variant="heading-3">{t('vocab.summary.reviewed', { n: s?.reviewed ?? 0 })}</Text>
            <Text variant="body-m" color="secondary">{t('vocab.summary.newLearned', { n: s?.newLearned ?? 0 })}</Text>
            {s?.accuracy != null ? <Text variant="body-m" color="secondary">{t('vocab.summary.accuracy', { n: Math.round(s.accuracy) })}</Text> : null}
            <Text variant="caption" color="tertiary">{t('vocab.summary.dueNow', { n: s?.dueNow ?? 0 })}</Text>
          </Card>
        </View>
      </Screen>
    );
  }
  if (state.phase === 'loading' || !card) {
    return (
      <Screen header={<TopBar variant="focus" onClose={close} />}>
        <Skeleton height={200} />
      </Screen>
    );
  }

  const p = session?.progress;
  const w = card.word;
  return (
    <Screen
      header={
        <TopBar
          variant="focus"
          onClose={close}
          progress={p?.total ? p.reviewed / p.total : 0}
          counter={p?.total ? `${Math.min(p.reviewed + 1, p.total)} / ${p.total}` : undefined}
        />
      }
      edges={['bottom']}
      footer={
        revealed ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {RATINGS.map((r) => (
              <Button
                key={r}
                title={`${t(`vocab.rating.${r}`)}\n${intervalLabel(t, card.intervals?.[r])}`}
                variant={r === 'good' ? 'primary' : 'secondary'}
                size="md"
                disabled={busy}
                onPress={() => rate(r)}
                style={{ flex: 1, paddingHorizontal: 4 }}
                accessibilityLabel={`${t(`vocab.rating.${r}`)}, ${intervalLabel(t, card.intervals?.[r])}`}
              />
            ))}
          </View>
        ) : (
          <Button title={t('vocab.review.show')} onPress={() => setRevealed(true)} />
        )
      }
    >
      <View style={{ gap: 16 }}>
        {message ? <Banner tone="danger" message={message} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {card.isNew ? <Text variant="label-s" color="accent">{t('vocab.review.new')}</Text> : null}
          <View style={{ flex: 1 }} />
          {lastRated ? <IconButton icon={Undo2} accessibilityLabel={t('vocab.review.undo')} onPress={undo} disabled={busy} /> : null}
        </View>
        <Card elevation="e1" style={{ alignItems: 'center', gap: 6, paddingVertical: 32 }}>
          <Text variant="display-m" align="center">{w.headword}</Text>
          <Text variant="body-m" color="secondary">{[w.partOfSpeech, w.pronunciationIpa].filter(Boolean).join('  ')}</Text>
        </Card>
        {revealed ? (
          <View style={{ gap: 12 }}>
            {w.meanings?.map((m, i) => (
              <Text key={i} variant="title">{m.note ? `${m.tr} (${m.note})` : m.tr}</Text>
            ))}
            {w.examples?.length ? (
              <View style={{ gap: 6 }}>
                <Text variant="overline" color="tertiary">{t('vocab.review.examples')}</Text>
                {w.examples.slice(0, 3).map((ex, i) => (
                  <View key={i}>
                    <Text variant="reading-m" italic>{ex.en}</Text>
                    <Text variant="body-s" color="secondary">{ex.tr}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {w.synonyms?.length ? (
              <Text variant="body-s" color="secondary">{`${t('vocab.review.synonyms')}: ${w.synonyms.join(', ')}`}</Text>
            ) : null}
            {w.collocations?.length ? (
              <Text variant="body-s" color="secondary">{`${t('vocab.review.collocations')}: ${w.collocations.join(', ')}`}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
