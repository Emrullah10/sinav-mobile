import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, EmptyState, ListRow, QueryBoundary, Screen, Sheet, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, formatClock, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { ReportSheet } from '@features/content/ReportSheet';
import { QuestionBody, plain } from '@features/question/QuestionBody';
import { TapText } from '@features/lexicon/TapText';
import { useT } from '@shared/translation/useT';

const FILTERS = ['all', 'wrong', 'blank', 'correct', 'flagged'];

function ReviewItem({ code, n, onReport, onAskTutor, asking }) {
  const { t } = useT();
  const query = useQuery({
    queryKey: queryKeys.learning.examReviewItem(code, n),
    enabled: n != null,
    queryFn: async () => unwrap(await api.learningExamReviewItemGet(code, n)),
  });
  return (
    <QueryBoundary query={query}>
      {(v) => {
        const correct = v.review.correctLabel;
        const optionStates = { [correct]: 'correct' };
        if (v.review.selectedLabel && v.review.selectedLabel !== correct) optionStates[v.review.selectedLabel] = 'wrong';
        return (
          <View style={{ gap: 12 }}>
            <Text variant="caption" color="tertiary">
              {`${t('exam.review.yours', { a: v.review.selectedLabel || '–', b: correct })} · ${formatClock((v.review.timeMs || 0) / 1000)}`}
            </Text>
            <QuestionBody question={v.question} passage={v.passage} optionStates={optionStates} disabled selectedLabel={v.review.selectedLabel} lexicon={{ sentences: true, options: true }} />
            {v.solution?.explanation ? (
              <Card style={{ gap: 6 }}>
                <Text variant="heading-3">{t('session.solution.title')}</Text>
                <TapText variant="body-m" lang="auto" text={plain(v.solution.explanation)} />
              </Card>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              <Button title={t('session.askTutor')} variant="secondary" size="md" fullWidth={false} loading={asking} onPress={() => onAskTutor(n)} />
              <Button title={t('report.action')} variant="tertiary" size="md" fullWidth={false} onPress={() => onReport(v.question.itemCode, n)} />
            </View>
            {v.hints?.length ? (
              <Card style={{ gap: 4 }}>
                <Text variant="label-m" color="secondary">{t('exam.review.hints')}</Text>
                {v.hints.map((h) => <Text key={h.stepNo} variant="body-s">{`${h.stepNo}. ${plain(h.body)}`}</Text>)}
              </Card>
            ) : null}
          </View>
        );
      }}
    </QueryBoundary>
  );
}

export default function ExamReview() {
  const { id: code } = useLocalSearchParams();
  const { t } = useT();
  const toast = useToast();
  const sheet = useRef(null);
  const reportSheet = useRef(null);
  const [filter, setFilter] = useState('wrong');
  const [open, setOpen] = useState(null);
  const [asking, setAsking] = useState(false);
  const askTutor = async (position) => {
    setAsking(true);
    try {
      const conv = unwrap(await api.tutorConversationCreate({ mode: 'explain', context: { kind: 'mock_review', sessionCode: String(code), position } }));
      sheet.current?.dismiss();
      router.push(`/tutor/${conv.code}`);
    } catch (e) {
      toast.show({ message: errorText(t, e), tone: 'danger' });
    } finally {
      setAsking(false);
    }
  };
  const query = useQuery({
    queryKey: queryKeys.learning.examReview(code, filter),
    queryFn: async () => unwrap(await api.learningExamReviewList(code, filter)),
  });
  return (
    <Screen header={<TopBar title={t('exam.review.title')} onBack={() => router.back()} />} edges={['bottom']}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={t(`exam.review.filter.${f}`)} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>
        <QueryBoundary query={query}>
          {(d) =>
            d.items.length === 0 ? (
              <EmptyState title={t('exam.review.empty')} />
            ) : (
              <View>
                {d.items.map((it, i) => (
                  <ListRow
                    key={it.position}
                    title={`${it.position}. ${plain(it.stemPreview)}`}
                    subtitle={it.type?.name}
                    value={t(`session.result.status.${it.result}`)}
                    divider={i < d.items.length - 1}
                    onPress={() => {
                      setOpen(it.position);
                      sheet.current?.present();
                    }}
                  />
                ))}
              </View>
            )
          }
        </QueryBoundary>
      </View>
      <Sheet ref={sheet} title={open ? t('exam.run.question', { n: open }) : ''} scrollable snapPoints={['90%']} onDismiss={() => setOpen(null)}>
        {open ? (
          <ReviewItem
            code={code}
            n={open}
            asking={asking}
            onAskTutor={askTutor}
            onReport={(itemCode, position) => reportSheet.current?.present({ itemCode, context: { sessionCode: Number(code), position } })}
          />
        ) : null}
      </Sheet>
      <ReportSheet ref={reportSheet} />
    </Screen>
  );
}
