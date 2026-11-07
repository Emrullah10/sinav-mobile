import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ListChecks, Lock, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BubbleLoader, Button, Card, Chip, EmptyState, ErrorState, OptionBubble, Screen, Skeleton, Text, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorKind, unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Kitabın etkinlikleri (tartışma, yazma): puanlanmaz, liste olarak gösterilir. */
function Activities({ items }) {
  const { t } = useT();
  if (!items?.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="heading-3" accessibilityRole="header">{t('read.quiz.activities')}</Text>
      <Text variant="body-s" color="secondary">{t('read.quiz.activitiesBody')}</Text>
      {items.map((a, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          <Text variant="body-m" color="tertiary">{`${i + 1}.`}</Text>
          <Text variant="reading-m" style={{ flex: 1 }}>{a}</Text>
        </View>
      ))}
    </View>
  );
}

/** Kitap soruları: tek tek çözülür, seçimden sonra doğru cevap ve kısa açıklama; sonda puan ve kitabın etkinlikleri. */
export default function BookQuizScreen() {
  const { code } = useLocalSearchParams();
  const { t } = useT();
  const { colors, radius } = useTheme();
  const bookQ = useQuery({ queryKey: queryKeys.content.readingBook(code), queryFn: async () => unwrap(await api.contentReadingBookGet(code)) });
  const quizQ = useQuery({
    queryKey: [...queryKeys.content.readingBook(code), 'quiz'],
    queryFn: async () => unwrap(await api.contentReadingQuizGet(code)),
    // İlk açılışta sorular sunucuda hazırlanır: hazır olana dek kısa aralıkla sorulur.
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 2500 : false),
    retry: false,
  });
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState({});
  const [done, setDone] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace(deepLinks.book(code)));

  const quiz = quizQ.data;
  const questions = quiz?.status === 'ready' ? quiz.questions || [] : [];
  const total = questions.length;
  const q = questions[at];
  const picked = q ? picks[q.id] : undefined;
  const answered = picked !== undefined;
  const solving = total > 0 && !done;

  const header = (
    <TopBar
      variant={solving ? 'focus' : 'standard'}
      title={solving ? undefined : t('read.quiz.title')}
      subtitle={solving ? undefined : bookQ.data?.title}
      onBack={solving ? undefined : back}
      onClose={solving ? back : undefined}
      progress={solving ? (at + (answered ? 1 : 0)) / total : undefined}
      counter={solving ? t('read.quiz.progress', { n: at + 1, total }) : undefined}
    />
  );

  let body;
  let footer;
  if (quizQ.isLoading) {
    body = <View style={{ gap: 12 }}><Skeleton height={28} width="50%" /><Skeleton height={220} /></View>;
  } else if (quizQ.isError && apiErrorCode(quizQ.error) === 'READING_QUIZ_LOCKED') {
    body = <EmptyState icon={Lock} title={t('read.quiz.locked')} description={t('read.quiz.lockedBody')} actionLabel={t('read.quiz.upgrade')} onAction={() => router.push(deepLinks.premium)} />;
  } else if (quizQ.isError) {
    body = <ErrorState kind={errorKind(quizQ.error)} onRetry={() => quizQ.refetch()} />;
  } else if (quiz.status === 'generating') {
    body = (
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 48 }}>
        <BubbleLoader label={t('read.quiz.generating')} />
        <Text variant="title" style={{ textAlign: 'center' }}>{t('read.quiz.generating')}</Text>
        <Text variant="body-m" color="secondary" style={{ textAlign: 'center' }}>{t('read.quiz.generatingBody')}</Text>
      </View>
    );
  } else if (quiz.status === 'failed') {
    const busy = quiz.errorCode === 'READING_QUIZ_BUSY';
    body = <EmptyState icon={ListChecks} title={busy ? t('read.quiz.busy') : t('read.quiz.failed')} description={busy ? undefined : t('read.quiz.failedBody')} actionLabel={t('read.quiz.backToBook')} onAction={back} />;
  } else if (!total) {
    body = quiz.activities?.length ? <Activities items={quiz.activities} /> : <EmptyState icon={ListChecks} title={t('read.quiz.empty')} actionLabel={t('read.quiz.backToBook')} onAction={back} />;
  } else if (done) {
    const score = questions.filter((x) => picks[x.id] === x.answer).length;
    const ratio = score / total;
    const note = ratio >= 0.8 ? 'read.quiz.resultGreat' : ratio >= 0.5 ? 'read.quiz.resultGood' : 'read.quiz.resultLow';
    body = (
      <View style={{ gap: 24 }}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          <Text variant="display-m">{`${score}/${total}`}</Text>
          <Text variant="title">{t('read.quiz.result', { n: score, total })}</Text>
          <Text variant="body-m" color="secondary" style={{ textAlign: 'center' }}>{t(note)}</Text>
        </View>
        <Activities items={quiz.activities} />
      </View>
    );
    footer = (
      <View style={{ gap: 8 }}>
        <Button title={t('read.quiz.retry')} leftIcon={RotateCcw} onPress={() => { setPicks({}); setAt(0); setDone(false); }} />
        <Button title={t('read.quiz.backToBook')} variant="secondary" leftIcon={BookOpen} onPress={back} />
      </View>
    );
  } else {
    const last = at === total - 1;
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row' }}>
          <Chip size="sm" label={q.source === 'book' ? t('read.quiz.fromBook') : t('read.quiz.fromAi')} selected={q.source === 'book'} />
        </View>
        <Text variant="reading-m" accessibilityRole="header">{q.stem}</Text>
        <View style={{ gap: 8 }}>
          {q.options.map((o, i) => {
            const state = !answered ? 'default' : i === q.answer ? 'correct' : i === picked ? 'wrong' : 'disabled';
            const status = !answered ? null : i === q.answer ? (i === picked ? t('read.quiz.correct') : t('read.quiz.rightAnswer')) : i === picked ? t('read.quiz.wrong') : null;
            const tone = state === 'correct' ? colors.success : state === 'wrong' ? colors.danger : null;
            return (
              <Pressable
                key={i}
                disabled={answered}
                onPress={() => setPicks((p) => ({ ...p, [q.id]: i }))}
                accessibilityRole="button"
                accessibilityLabel={`${LETTERS[i]}. ${o}${status ? `, ${status}` : ''}`}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: tone ? tone.fg : colors.border.default,
                  backgroundColor: tone ? tone.bg : pressed ? colors.bg.pressed : colors.bg.surface,
                })}
              >
                <OptionBubble letter={LETTERS[i]} state={state} />
                <Text variant="body-l" color={state === 'disabled' ? 'disabled' : undefined} style={{ flex: 1 }}>{o}</Text>
                {status ? <Text variant="label-s" style={{ color: tone?.fg || colors.text.secondary }}>{status}</Text> : null}
              </Pressable>
            );
          })}
        </View>
        {answered && q.explanation ? (
          <Card>
            <Text variant="body-m">{q.explanation}</Text>
          </Card>
        ) : null}
      </View>
    );
    footer = answered ? <Button title={last ? t('read.quiz.seeResult') : t('read.quiz.next')} onPress={() => (last ? setDone(true) : setAt(at + 1))} /> : undefined;
  }

  return (
    <Screen header={header} footer={footer} edges={['bottom']}>
      {body}
    </Screen>
  );
}
