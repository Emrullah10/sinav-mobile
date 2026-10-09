import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Grid3x3 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Banner, Button, EmptyState, ErrorState, IconButton, Screen, Sheet, Skeleton, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { apiErrorCode, errorKind, errorText, formatClock, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { QuestionBody } from '@features/question/QuestionBody';
import { useItemTimer } from '@hooks/useItemTimer';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const SLICE = 40;

/** Deneme oturumu: sunucu zaman otoritesi; cevaplar anında PUT ile kaydedilir. */
export default function ExamRunner() {
  const { code } = useLocalSearchParams();
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const palette = useRef(null);
  const [posOverride, setPos] = useState(null);
  const [answers, setAnswers] = useState({}); // position -> { selectedLabel, flagged } (yerel üst yazımlar)
  const [clockOverride, setClockOverride] = useState(null); // { remaining, at }
  const [pausedLocal, setPausedLocal] = useState(null);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timer = useItemTimer(posOverride);

  const sitting = useQuery({
    queryKey: queryKeys.learning.examSitting(code),
    staleTime: 0,
    queryFn: async () => unwrap(await api.learningExamSittingGet(code)),
  });
  const s = sitting.data;
  const pos = posOverride ?? (s ? s.currentPosition || 1 : null);
  const paused = pausedLocal ?? s?.status === 'paused';
  const total = s?.questionCount || 0;

  const goResult = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.learning.exams() });
    qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
    router.replace(`/deneme/${code}/sonuc`);
  }, [code, qc]);

  const syncClock = (secs) => {
    if (secs != null) setClockOverride({ remaining: secs, at: Date.now() });
  };

  const sliceStart = pos ? Math.floor((pos - 1) / SLICE) * SLICE + 1 : null;
  const slice = useQuery({
    queryKey: ['learning', 'examSlice', code, sliceStart],
    enabled: sliceStart != null && !paused && s?.status === 'in_progress',
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = unwrap(await api.learningExamQuestionsGet(code, { from: sliceStart, to: sliceStart + SLICE - 1 }));
      syncClock(res.remainingSeconds);
      return res;
    },
  });
  const sliceCode = slice.error ? apiErrorCode(slice.error) : null;
  const q = slice.data?.items.find((i) => i.position === pos) || null;
  const passage = q?.passageItemCode ? slice.data.passages?.find((p) => p.itemCode === q.passageItemCode) : null;

  useEffect(() => {
    if (s?.status === 'submitted' || sliceCode === 'EXAM_TIME_UP' || sliceCode === 'EXAM_ALREADY_SUBMITTED') goResult();
  }, [s?.status, sliceCode, goResult]);

  // Görsel geri sayım (sunucu otorite; cevap yanıtlarında yeniden eşitlenir).
  const clock = clockOverride ?? (s ? { remaining: s.remainingSeconds, at: sitting.dataUpdatedAt } : null);
  const timedOut = useRef(false);
  useEffect(() => {
    if (paused || !clock) return undefined;
    const id = setInterval(() => {
      const t0 = Date.now();
      setNow(t0);
      if (clock.remaining - Math.round((t0 - clock.at) / 1000) <= 0 && !timedOut.current) {
        timedOut.current = true;
        toast.show({ message: t('exam.run.timeUp') });
        api.learningExamSubmit(code).catch(() => {}).finally(goResult);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paused, clock?.remaining, clock?.at, code, goResult, t, toast]); // eslint-disable-line react-hooks/exhaustive-deps
  const remaining = clock ? Math.max(0, clock.remaining - Math.round(((now || clock.at) - clock.at) / 1000)) : null;

  const baseOf = (n) => {
    const it = slice.data?.items.find((i) => i.position === n);
    if (it) return { selectedLabel: it.selectedLabel, flagged: Boolean(it.isFlagged) };
    const si = s?.items?.find((i) => i.position === n);
    return { selectedLabel: si?.answered ? '?' : null, flagged: Boolean(si?.flagged) };
  };
  const stateOf = (n) => answers[n] ?? baseOf(n);

  const putAnswer = async (position, patch) => {
    const prev = stateOf(position);
    const next = { ...prev, ...patch };
    setAnswers((cur) => ({ ...cur, [position]: next }));
    try {
      const res = unwrap(
        await api.learningExamAnswerPut(code, position, {
          selectedLabel: next.selectedLabel ?? null,
          flagged: next.flagged,
          timeMs: timer.elapsed(),
        }),
      );
      timer.reset();
      syncClock(res.remainingSeconds);
      setMessage(null);
    } catch (e) {
      setAnswers((cur) => ({ ...cur, [position]: prev }));
      const c = apiErrorCode(e);
      if (c === 'EXAM_TIME_UP' || c === 'EXAM_ALREADY_SUBMITTED') goResult();
      else if (c === 'EXAM_PAUSED') setPausedLocal(true);
      else setMessage(e.response ? errorText(t, e) : t('exam.run.saveFailed'));
    }
  };

  const all = Array.from({ length: total }, (_, i) => stateOf(i + 1));
  const answeredCount = all.filter((a) => a.selectedLabel).length;
  const flaggedCount = all.filter((a) => a.flagged).length;

  const submit = () => {
    const blank = total - answeredCount;
    Alert.alert(t('exam.run.submit.title'), t('exam.run.submit.body', { blank }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('exam.run.submit.confirm'),
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.learningExamSubmit(code);
            goResult();
          } catch (e) {
            setSubmitting(false);
            if (apiErrorCode(e) === 'EXAM_ALREADY_SUBMITTED') goResult();
            else setMessage(errorText(t, e));
          }
        },
      },
    ]);
  };

  const exit = () => {
    const canPause = true; // sunucu duraklatmaya izin vermiyorsa 409 döner ve çıkış yine yapılır
    Alert.alert(t('exam.run.exit.title'), canPause ? t('exam.run.exit.body') : t('exam.run.exit.noPause'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('exam.run.exit.pause'),
        onPress: async () => {
          await api.learningExamPause(code).catch(() => {});
          router.replace('/deneme');
        },
      },
      { text: t('exam.run.exit.leave'), style: 'destructive', onPress: () => router.replace('/deneme') },
    ]);
  };

  const resume = async () => {
    try {
      await api.learningExamResume(code);
      setPausedLocal(false);
      qc.removeQueries({ queryKey: ['learning', 'examSlice', code] });
      sitting.refetch();
    } catch (e) {
      setMessage(errorText(t, e));
    }
  };

  const fatal = sitting.error || (slice.isError && !['EXAM_PAUSED', 'EXAM_TIME_UP', 'EXAM_ALREADY_SUBMITTED'].includes(sliceCode) ? slice.error : null);
  if (fatal) {
    return (
      <Screen header={<TopBar variant="focus" onClose={() => router.replace('/deneme')} />}>
        <ErrorState kind={errorKind(fatal)} onRetry={() => (sitting.isError ? sitting.refetch() : slice.refetch())} />
      </Screen>
    );
  }
  if (paused || sliceCode === 'EXAM_PAUSED') {
    return (
      <Screen header={<TopBar variant="focus" onClose={() => router.replace('/deneme')} />} edges={['bottom']} footer={<Button title={t('exam.run.resume')} onPress={resume} />}>
        <EmptyState title={t('exam.run.paused')} />
      </Screen>
    );
  }
  if (!s || !q) {
    return (
      <Screen header={<TopBar variant="focus" onClose={exit} />}>
        <View style={{ gap: 12 }}>
          <Skeleton height={32} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      </Screen>
    );
  }
  const a = stateOf(pos);
  const clockText = remaining != null ? formatClock(remaining) : undefined;

  return (
    <Screen
      header={
        <TopBar
          variant="focus"
          onClose={exit}
          progress={answeredCount / (total || 1)}
          counter={t('session.counter', { n: pos, total })}
          timer={clockText}
        />
      }
      edges={['bottom']}
      footer={
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Button title={t('exam.run.prev')} variant="secondary" size="md" fullWidth={false} disabled={pos <= 1} onPress={() => setPos(pos - 1)} style={{ flex: 1 }} />
          <IconButton icon={Grid3x3} variant="outlined" accessibilityLabel={t('exam.run.palette')} onPress={() => palette.current?.present()} />
          {pos < total ? (
            <Button title={t('exam.run.next')} size="md" fullWidth={false} onPress={() => setPos(pos + 1)} style={{ flex: 1 }} />
          ) : (
            <Button title={t('exam.run.submit')} size="md" fullWidth={false} loading={submitting} onPress={submit} style={{ flex: 1 }} />
          )}
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        {message ? <Banner tone="danger" message={message} onClose={() => setMessage(null)} /> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
          <Button
            title={t('exam.run.clear')}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            disabled={!a.selectedLabel}
            onPress={() => putAnswer(pos, { selectedLabel: null })}
          />
          <IconButton
            icon={Flag}
            size={36}
            variant={a.flagged ? 'tonal' : 'standard'}
            accessibilityLabel={a.flagged ? t('exam.run.unflag') : t('exam.run.flag')}
            onPress={() => putAnswer(pos, { flagged: !a.flagged })}
          />
        </View>
        <QuestionBody
          question={{ ...q, questionType: q.type }}
          passage={passage}
          selectedLabel={a.selectedLabel}
          onSelect={(label) => putAnswer(pos, { selectedLabel: label })}
        />
      </View>

      <Sheet ref={palette} title={t('exam.run.palette')} scrollable>
        <Text variant="body-s" color="secondary" style={{ marginBottom: 8 }}>
          {`${t('exam.run.answered', { n: answeredCount, total })} · ${t('exam.run.flagged', { n: flaggedCount })}`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
            const st = all[n - 1] || {};
            return (
              <Pressable
                key={n}
                onPress={() => {
                  palette.current?.dismiss();
                  setPos(n);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('exam.run.question', { n })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: n === pos ? 2 : 1,
                  borderColor: st.flagged ? colors.reward.default : n === pos ? colors.accent.default : colors.border.default,
                  backgroundColor: st.selectedLabel ? colors.accent['subtle-bg'] : colors.bg.surface,
                }}
              >
                <Text variant="label-m">{n}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button title={t('exam.run.submit')} style={{ marginTop: 16 }} onPress={() => { palette.current?.dismiss(); submit(); }} />
      </Sheet>
    </Screen>
  );
}
