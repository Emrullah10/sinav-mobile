import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coffee, Target } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { Banner, Button, EmptyState, ErrorState, Screen, Skeleton, Text, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, newClientRef, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { QuestionBody } from '@features/question/QuestionBody';
import { useItemTimer } from '@hooks/useItemTimer';
import { useHeartbeat } from '@hooks/useHeartbeat';
import { useT } from '@shared/translation/useT';

/** Seviye tespiti: giriş -> sorular (geri bildirimsiz) -> ara durak -> sonuç. */
export default function Diagnostic() {
  const { t } = useT();
  const qc = useQueryClient();
  const [phase, setPhase] = useState('intro'); // intro | loading | question | halfway | finishing
  const [session, setSession] = useState(null);
  const [view, setView] = useState(null); // itemView
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const clientRef = useRef(newClientRef());
  const timer = useItemTimer(view?.position);

  const enrollment = useQuery({
    queryKey: queryKeys.learning.enrollment(),
    queryFn: async () => unwrap(await api.learningEnrollmentActiveGet()).enrollment,
  });
  useHeartbeat(session?.code, phase === 'question');

  const finish = async (code) => {
    setPhase('finishing');
    try {
      await api.learningDiagnosticComplete(code);
      qc.invalidateQueries({ queryKey: queryKeys.learning.enrollment() });
      router.replace({ pathname: '/seviye-tespiti/sonuc', params: { code: String(code) } });
    } catch (e) {
      setError(errorText(t, e));
      setPhase('question');
    }
  };

  const loadItem = async (code, position) => {
    const res = unwrap(await api.learningDiagnosticGet(code, position ? { position } : undefined));
    setSession(res.session);
    if (!res.current) return finish(code);
    clientRef.current = newClientRef();
    setSelected(null);
    setView(res.current);
    setPhase('question');
    return null;
  };

  const start = async () => {
    setError(null);
    setPhase('loading');
    try {
      const res = unwrap(await api.learningDiagnosticStart());
      const s = res.session;
      setSession(s);
      if (s.status === 'completed') {
        router.replace({ pathname: '/seviye-tespiti/sonuc', params: { code: String(s.code) } });
        return;
      }
      await loadItem(s.code, s.currentPosition);
    } catch (e) {
      setError(apiErrorCode(e) === 'DIAGNOSTIC_UNAVAILABLE' ? t('diag.unavailable') : errorText(t, e));
      setPhase('intro');
    }
  };

  const skip = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.learningDiagnosticSkip();
      qc.invalidateQueries({ queryKey: queryKeys.learning.enrollment() });
      router.replace('/plan-onizleme');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const answer = async (label) => {
    if (!session || !view) return;
    setBusy(true);
    setError(null);
    try {
      const res = unwrap(
        await api.learningDiagnosticAnswer(session.code, {
          position: view.position,
          selectedLabel: label,
          timeMs: timer.elapsed(),
          clientRef: clientRef.current,
        }),
      );
      if (res.halfway) {
        setPhase('halfway');
        return;
      }
      if (res.next == null) {
        await finish(session.code);
        return;
      }
      if (res.nextItem) {
        clientRef.current = newClientRef();
        setSelected(null);
        setView(res.nextItem);
        timer.reset();
      } else {
        await loadItem(session.code, res.next);
      }
    } catch (e) {
      if (apiErrorCode(e) === 'ITEM_ALREADY_ANSWERED') {
        await loadItem(session.code);
      } else setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const exit = () => {
    if (phase === 'question' && session) {
      Alert.alert(t('diag.exit.title'), t('diag.exit.body'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('diag.exit.confirm'),
          onPress: async () => {
            await api.learningDiagnosticPause(session.code).catch(() => {});
            router.replace('/');
          },
        },
      ]);
    } else router.replace('/');
  };

  useEffect(() => {
    // Zaten tamamlanmış/atlanmışsa girişte durma.
    const diag = enrollment.data?.diagnostic?.status;
    if (diag === 'completed' && enrollment.data?.diagnostic?.sessionCode) {
      router.replace({
        pathname: '/seviye-tespiti/sonuc',
        params: { code: String(enrollment.data.diagnostic.sessionCode) },
      });
    }
  }, [enrollment.data]);

  if (phase === 'intro') {
    const diag = enrollment.data?.diagnostic?.status;
    const resumable = diag === 'in_progress' || diag === 'paused';
    return (
      <Screen
        header={<TopBar onClose={exit} variant="focus" />}
        edges={['bottom']}
        footer={
          <View style={{ gap: 8 }}>
            <Button title={resumable ? t('diag.intro.resume') : t('diag.intro.start')} onPress={start} disabled={enrollment.isPending} />
            <Button title={t('diag.intro.skip')} variant="tertiary" onPress={skip} loading={busy} />
          </View>
        }
      >
        <EmptyState icon={Target} title={t('diag.intro.title')} description={t('diag.intro.body')} />
        <Text variant="caption" color="tertiary" align="center">
          {t('diag.intro.skipNote')}
        </Text>
        {error ? <Banner tone="danger" message={error} style={{ marginTop: 16 }} /> : null}
      </Screen>
    );
  }

  if (phase === 'halfway') {
    return (
      <Screen
        header={<TopBar variant="focus" onClose={exit} />}
        edges={['bottom']}
        footer={<Button title={t('diag.halfway.continue')} onPress={() => loadItem(session.code)} />}
      >
        <EmptyState icon={Coffee} title={t('diag.halfway.title')} description={t('diag.halfway.body')} />
      </Screen>
    );
  }

  if (phase === 'loading' || phase === 'finishing' || !view) {
    return (
      <Screen header={<TopBar variant="focus" onClose={exit} />}>
        {error ? <ErrorState onRetry={start} description={error} /> : null}
        <View style={{ gap: 12 }}>
          <Skeleton height={32} />
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
        {phase === 'finishing' ? (
          <Text variant="body-m" color="secondary" align="center" style={{ marginTop: 16 }}>
            {t('diag.finishing')}
          </Text>
        ) : null}
      </Screen>
    );
  }

  const isLast = view.position >= view.total;
  return (
    <Screen
      header={
        <TopBar
          variant="focus"
          onClose={exit}
          progress={(view.position - 1) / view.total}
          counter={t('diag.counter', { n: view.position, total: view.total })}
        />
      }
      edges={['bottom']}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            title={isLast ? t('diag.finish') : t('diag.next')}
            disabled={!selected}
            loading={busy}
            onPress={() => answer(selected)}
          />
          <Button title={t('diag.dontKnow')} variant="tertiary" size="md" disabled={busy} onPress={() => answer(null)} />
        </View>
      }
    >
      {error ? <Banner tone="danger" message={error} style={{ marginBottom: 12 }} /> : null}
      <QuestionBody
        question={view.question}
        passage={view.passage}
        selectedLabel={selected}
        onSelect={setSelected}
        disabled={busy}
      />
    </Screen>
  );
}
