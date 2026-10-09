import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Chip, ProgressBar, QueryBoundary, Screen, Text, TextField, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, newClientRef, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

function Diff({ parts }) {
  const { colors } = useTheme();
  return (
    <Text variant="body-l">
      {parts.map((p, i) => (
        <Text
          key={i}
          variant="body-l"
          style={
            p.kind === 'added'
              ? { color: colors.success.fg, textDecorationLine: 'underline' }
              : p.kind === 'deleted'
                ? { color: colors.danger.fg, textDecorationLine: 'line-through' }
                : null
          }
        >
          {`${p.text} `}
        </Text>
      ))}
    </Text>
  );
}

export default function TranslationCoach() {
  const { t } = useT();
  const qc = useQueryClient();
  const [direction, setDirection] = useState('en_tr');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(newClientRef());

  const prompt = useQuery({
    queryKey: queryKeys.tutor.translationPrompt({ direction }),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => unwrap(await api.tutorTranslationPromptNext({ direction })),
  });

  const evaluate = useMutation({
    mutationFn: async () =>
      unwrap(await api.tutorTranslationEvaluate({ promptCode: prompt.data.promptCode, userText: answer.trim(), clientRef: clientRef.current })),
    onSuccess: (res) => {
      if (res.status === 'failed') setError(t('tr.failed'));
      else setResult(res);
      qc.invalidateQueries({ queryKey: queryKeys.tutor.usage() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
    },
    onError: (e) => setError(apiErrorCode(e) === 'QUOTA_EXCEEDED' ? t('tr.quota') : errorText(t, e)),
  });

  const next = () => {
    setResult(null);
    setAnswer('');
    setError(null);
    clientRef.current = newClientRef();
    prompt.refetch();
  };

  return (
    <Screen header={<TopBar title={t('tr.title')} onBack={() => router.back()} />} edges={['bottom']}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['en_tr', 'tr_en'].map((d) => (
            <Chip key={d} label={t(`tr.direction.${d}`)} selected={direction === d} onPress={() => { setDirection(d); setResult(null); setAnswer(''); }} />
          ))}
        </View>
        {error ? <Banner tone="danger" message={error} onClose={() => setError(null)} /> : null}
        <QueryBoundary
          query={prompt}
          errorOverride={(e) => (apiErrorCode(e) === 'TUTOR_TRANSLATION_PROMPT_NOT_FOUND' ? <Banner tone="info" message={t('tr.noPrompt')} /> : null)}
        >
          {(p) => (
            <View style={{ gap: 16 }}>
              {p.usage?.limit != null ? (
                <Text variant="caption" color="tertiary">{t('tr.usage', { n: p.usage.remaining })}</Text>
              ) : null}
              <Card elevation="e1">
                <Text variant="reading-l">{p.sourceText}</Text>
              </Card>
              {result ? (
                <View style={{ gap: 16 }}>
                  <Card style={{ alignItems: 'center', gap: 4 }}>
                    <Text variant="numeric-xl">{t('tr.score', { score: result.totalScore, max: result.maxScore })}</Text>
                    <ProgressBar value={result.maxScore ? result.totalScore / result.maxScore : 0} />
                  </Card>
                  <View style={{ gap: 6 }}>
                    <Text variant="heading-3">{t('tr.criteria')}</Text>
                    {result.scores.map((s) => (
                      <View key={s.key} style={{ gap: 2 }}>
                        <Text variant="label-m">{`${s.name}: ${s.points}/${s.maxPoints}`}</Text>
                        {s.comment ? <Text variant="body-s" color="secondary">{s.comment}</Text> : null}
                      </View>
                    ))}
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text variant="heading-3">{t('tr.suggested')}</Text>
                    <Text variant="body-l">{result.suggestedTranslation}</Text>
                  </View>
                  {result.feedback?.parts?.length ? (
                    <View style={{ gap: 6 }}>
                      <Text variant="heading-3">{t('tr.diff')}</Text>
                      <Diff parts={result.feedback.parts} />
                      <Text variant="caption" color="tertiary">{`${t('tr.legend.added')} · ${t('tr.legend.deleted')}`}</Text>
                    </View>
                  ) : null}
                  {result.feedback?.summary ? <Text variant="body-m">{result.feedback.summary}</Text> : null}
                  {result.feedback?.notes?.length ? (
                    <View style={{ gap: 4 }}>
                      <Text variant="heading-3">{t('tr.notes')}</Text>
                      {result.feedback.notes.map((n, i) => <Text key={i} variant="body-s" color="secondary">{`• ${n}`}</Text>)}
                    </View>
                  ) : null}
                  <Button title={t('tr.next')} onPress={next} />
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <TextField label={t('tr.yourTranslation')} value={answer} onChangeText={setAnswer} multiline maxLength={2000} showCounter />
                  <Button title={t('tr.evaluate')} onPress={() => { setError(null); evaluate.mutate(); }} loading={evaluate.isPending} disabled={!answer.trim()} />
                </View>
              )}
            </View>
          )}
        </QueryBoundary>
      </View>
    </Screen>
  );
}
