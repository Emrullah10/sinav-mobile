import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Flag } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  Banner, Button, Card, Chip, ErrorState, IconButton, Screen, Skeleton, Text, TopBar, useToast,
} from '@components';
import { api } from '@api';
import { apiErrorCode, errorKind, errorText, formatClock, newClientRef, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { QuestionBody, plain } from '@features/question/QuestionBody';
import { useHaptics } from '@hooks/useHaptics';
import { useHeartbeat } from '@hooks/useHeartbeat';
import { useItemTimer } from '@hooks/useItemTimer';
import { useT } from '@shared/translation/useT';

const MISTAKE_TYPES = ['knowledge_gap', 'attention', 'time', 'trap', 'vocabulary'];

/** Oturum oynatıcı: alıştırma, not kontrolü ve hata tekrarı (oturum uçları, docs/api/learning.md §6). */
export default function SessionPlayer() {
  const { id: code } = useLocalSearchParams();
  const { t } = useT();
  const qc = useQueryClient();
  const toast = useToast();
  const haptics = useHaptics();
  const [posOverride, setPos] = useState(null);
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null); // son cevap yanıtı
  const [message, setMessage] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const clientRef = useRef(newClientRef());

  const session = useQuery({
    queryKey: queryKeys.learning.session(code),
    queryFn: async () => unwrap(await api.learningSessionGet(code)),
  });
  const s = session.data;
  const pos = posOverride ?? (s ? s.currentPosition || 1 : null);

  const item = useQuery({
    queryKey: queryKeys.learning.sessionItem(code, pos),
    enabled: pos != null,
    staleTime: 0,
    queryFn: async () => unwrap(await api.learningSessionItemGet(code, pos)),
  });
  const view = item.data;
  const timer = useItemTimer(pos);
  useHeartbeat(code, Boolean(view));

  // Süreli oturum geri sayımı.
  const deadline = s?.config?.deadlineAt ? new Date(s.config.deadlineAt).getTime() : null;

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      await api.learningSessionComplete(code);
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.studyOverview() });
      qc.invalidateQueries({ queryKey: ['learning', 'mistakes'] });
      router.replace(`/soru/${code}/sonuc`);
    } catch (e) {
      setMessage(errorText(t, e));
      setBusy(false);
    }
  }, [code, qc, t]);

  useEffect(() => {
    if (!deadline) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        toast.show({ message: t('session.timeUp') });
        finish();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const refreshItem = () => item.refetch();
  const act = async (fn) => {
    setBusy(true);
    setMessage(null);
    try {
      return await fn();
    } catch (e) {
      const c = apiErrorCode(e);
      setMessage(
        c === 'QUOTA_EXCEEDED' ? t('session.quota') : c === 'SESSION_EXPIRED' ? t('session.expired') : errorText(t, e),
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const goTo = (n) => {
    setLast(null);
    setChoice(null);
    clientRef.current = newClientRef();
    setPos(n);
  };

  const answer = (label) =>
    act(async () => {
      const res = unwrap(
        await api.learningSessionAnswer(code, pos, {
          selectedLabel: label,
          timeMs: timer.elapsed(),
          clientRef: clientRef.current,
        }),
      );
      clientRef.current = newClientRef();
      setLast(res);
      if (res.outcome === 'correct' || res.outcome === 'correct_on_retry') haptics.correct();
      qc.invalidateQueries({ queryKey: queryKeys.learning.session(code) });
      if (res.feedback == null) {
        // Ertelenmiş geri bildirim: doğrudan sonraki soruya.
        if (res.next != null) goTo(res.next);
        else await finish();
        return;
      }
      if (res.outcome === 'skipped') {
        if (res.next != null) goTo(res.next);
        else await finish();
        return;
      }
      await refreshItem();
    });

  const revealHint = () =>
    act(async () => {
      await api.learningSessionHintReveal(code, pos);
      await refreshItem();
    });

  const revealSolution = () =>
    act(async () => {
      await api.learningSessionSolutionReveal(code, pos);
      await refreshItem();
    });

  const toggleFlag = () =>
    act(async () => {
      await api.learningSessionItemFlag(code, pos, !view.state.isFlagged);
      await refreshItem();
    });

  const addBookmark = () =>
    act(async () => {
      await api.learningBookmarkCreate({ itemCode: view.question.itemCode });
      toast.show({ message: t('session.bookmarked') });
      await refreshItem();
    });

  const setMistakeType = (type) =>
    act(async () => {
      await api.learningSessionMistakeTypeSet(code, pos, type);
      setLast((cur) => (cur ? { ...cur, mistake: { ...cur.mistake, mistakeType: type } } : cur));
      toast.show({ message: t('session.mistakeSaved') });
    });

  const askTutor = () =>
    act(async () => {
      const conv = unwrap(
        await api.tutorConversationCreate({ mode: 'explain', context: { kind: 'question', sessionCode: String(code), position: pos } }),
      );
      router.push(`/ogretmen/${conv.code}`);
    });

  const exit = () => {
    Alert.alert(t('session.exit.title'), t('session.exit.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('session.exit.confirm'),
        onPress: async () => {
          await api.learningSessionPause(code).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  if (session.isError || item.isError) {
    const err = session.error || item.error;
    return (
      <Screen header={<TopBar variant="focus" onClose={() => router.back()} />}>
        <ErrorState kind={errorKind(err)} onRetry={() => (session.isError ? session.refetch() : item.refetch())} />
      </Screen>
    );
  }
  if (!s || !view) {
    return (
      <Screen header={<TopBar variant="focus" onClose={() => router.back()} />}>
        <View style={{ gap: 12 }}>
          <Skeleton height={32} />
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      </Screen>
    );
  }

  const st = view.state;
  const fb = view.feedback?.isCorrect != null ? view.feedback : null;
  const sol = view.solution;
  const correctLabel = fb?.correctLabel || sol?.correctLabel || null;
  const finalized = Boolean(correctLabel);
  const optionStates = {};
  if (correctLabel) {
    optionStates[correctLabel] = 'correct';
    if (st.selectedLabel && st.selectedLabel !== correctLabel) optionStates[st.selectedLabel] = 'wrong';
  }
  const eliminated = [...new Set([...(st.eliminatedLabels || []), ...(last?.feedback?.eliminatedLabels || [])])];
  const canRetry = Boolean(st.canRetry) && !finalized;
  const immediate = s.feedbackMode === 'immediate';
  const nextPos = last?.next ?? (view.position < view.total ? view.position + 1 : null);
  const isLastStep = nextPos == null;
  const wrongNow = last?.outcome === 'wrong_final' || (finalized && st.isCorrect === false);
  const bookmarked = view.question.bookmarked;

  return (
    <Screen
      header={
        <TopBar
          variant="focus"
          onClose={exit}
          progress={(s.progress?.answered || 0) / (s.plannedItemCount || view.total)}
          counter={t('session.counter', { n: view.position, total: view.total })}
          timer={remaining != null ? formatClock(remaining) : undefined}
        />
      }
      edges={['bottom']}
      footer={
        immediate && finalized ? (
          <Button title={isLastStep ? t('session.finish') : t('session.next')} loading={busy} onPress={() => (isLastStep ? finish() : goTo(nextPos))} />
        ) : (
          <View style={{ gap: 4 }}>
            <Button title={t('session.check')} disabled={!choice} loading={busy} onPress={() => answer(choice)} />
            <Button title={t('session.skip')} variant="tertiary" size="md" disabled={busy} onPress={() => answer(null)} />
          </View>
        )
      }
    >
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
          <IconButton
            icon={Flag}
            size={36}
            variant={st.isFlagged ? 'tonal' : 'standard'}
            accessibilityLabel={st.isFlagged ? t('session.unflag') : t('session.flag')}
            onPress={toggleFlag}
          />
          <IconButton
            icon={Bookmark}
            size={36}
            variant={bookmarked ? 'tonal' : 'standard'}
            disabled={bookmarked}
            accessibilityLabel={bookmarked ? t('session.bookmarked') : t('session.bookmark')}
            onPress={addBookmark}
          />
        </View>
        {message ? <Banner tone="danger" message={message} onClose={() => setMessage(null)} /> : null}
        <QuestionBody
          question={view.question}
          passage={view.passage}
          selectedLabel={finalized ? st.selectedLabel : choice}
          onSelect={setChoice}
          optionStates={optionStates}
          eliminated={eliminated}
          disabled={busy || finalized}
        />

        {fb || canRetry ? (
          <Banner
            tone={canRetry ? 'warning' : fb?.isCorrect ? 'success' : 'danger'}
            title={
              canRetry
                ? undefined
                : fb?.isCorrect
                  ? fb.correctOnFirstTry === false
                    ? t('session.feedback.correctRetry')
                    : t('session.feedback.correct')
                  : t('session.feedback.wrong')
            }
            message={
              canRetry
                ? t('session.feedback.retry')
                : [fb?.isCorrect ? null : correctLabel ? t('session.feedback.answerWas', { label: correctLabel }) : null, fb?.shortReason].filter(Boolean).join('\n')
            }
          />
        ) : null}

        {st.hintSteps?.length ? (
          <Card style={{ gap: 6 }}>
            <Text variant="label-m" color="secondary">{t('session.hint.title')}</Text>
            {st.hintSteps.map((h) => (
              <Text key={h.stepNo} variant="body-m">{`${h.stepNo}. ${plain(h.body)}`}</Text>
            ))}
          </Card>
        ) : null}

        {sol ? (
          <Card style={{ gap: 8 }}>
            <Text variant="heading-3">{t('session.solution.title')}</Text>
            {sol.explanation ? <Text variant="body-m">{plain(sol.explanation)}</Text> : null}
            {sol.options?.filter((o) => o.rationale).map((o) => (
              <Text key={o.label} variant="body-s" color="secondary">{`${o.label}) ${plain(o.rationale)}`}</Text>
            ))}
            {sol.noteLink ? (
              <Button title={sol.noteLink.title} variant="secondary" size="md" onPress={() => router.push(`/not/${sol.noteLink.itemCode}`)} />
            ) : null}
          </Card>
        ) : null}

        {!finalized && s.hintsEnabled && st.hintsTotal > 0 && st.hintsRevealed < st.hintsTotal ? (
          <View style={{ gap: 4 }}>
            <Button
              title={t('session.hint', { n: st.hintsRevealed, total: st.hintsTotal })}
              variant="secondary"
              size="md"
              fullWidth={false}
              disabled={busy}
              onPress={revealHint}
            />
            {st.hintsRevealed === st.hintsTotal - 1 ? (
              <Text variant="caption" color="tertiary">{t('session.hint.solutionWarn')}</Text>
            ) : null}
          </View>
        ) : null}

        {immediate && !finalized && s.hintsEnabled ? (
          <Button
            title={t('session.solution')}
            variant="tertiary"
            size="md"
            fullWidth={false}
            disabled={busy}
            onPress={() => Alert.alert(t('session.solution.title'), t('session.solution.confirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('session.solution'), onPress: revealSolution },
            ])}
          />
        ) : null}

        {finalized && !sol && immediate ? (
          <Button title={t('session.solution')} variant="secondary" size="md" fullWidth={false} disabled={busy} onPress={revealSolution} />
        ) : null}

        {finalized && wrongNow ? (
          <View style={{ gap: 8 }}>
            <Text variant="label-m" color="secondary">{t('session.mistakeType')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MISTAKE_TYPES.map((ty) => (
                <Chip
                  key={ty}
                  label={t(`enums.mistake_type.${ty}`)}
                  selected={last?.mistake?.mistakeType === ty}
                  onPress={() => setMistakeType(ty)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {finalized ? (
          <Button title={t('session.askTutor')} variant="tertiary" size="md" fullWidth={false} disabled={busy} onPress={askTutor} />
        ) : null}
      </View>
    </Screen>
  );
}
