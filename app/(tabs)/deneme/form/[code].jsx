import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Chip, ListRow, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';

export default function ExamForm() {
  const { code } = useLocalSearchParams();
  const { t } = useT();
  const [mode, setMode] = useState(null);
  const [error, setError] = useState(null);
  const query = useQuery({
    queryKey: queryKeys.learning.examForm(code),
    queryFn: async () => unwrap(await api.learningExamFormGet(code)),
  });
  const start = useMutation({
    mutationFn: async (f) => unwrap(await api.learningExamStart(f.code, mode ?? f.defaultMode)),
    onSuccess: (res) => router.replace(`/sinav/${res.sitting.code}`),
    onError: (e) => {
      const c = apiErrorCode(e);
      if (c === 'EXAM_SITTING_ACTIVE') {
        const sc = e.response?.data?.error?.details?.sittingCode;
        if (sc) return router.replace(`/sinav/${sc}`);
        return setError(t('exam.form.otherActive'));
      }
      setError(c === 'QUOTA_EXCEEDED' ? t('exam.form.quotaOut') : c === 'EXAM_FORM_LOCKED' ? t('exam.form.lockedBody') : errorText(t, e));
    },
  });

  const f = query.data;
  const locked = f?.locked;
  const outOfQuota = f?.quota && f.quota.enabled !== false && f.quota.remaining === 0;
  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title={f?.title || ''} />}
      edges={['bottom']}
      footer={
        f ? (
          locked ? (
            <Button title={t('today.access.upgrade')} onPress={() => router.push('/premium')} />
          ) : (
            <Button
              title={f.activeSittingCode ? t('exam.resume') : t('exam.form.start')}
              loading={start.isPending}
              disabled={Boolean(outOfQuota) && !f.activeSittingCode}
              onPress={() => (f.activeSittingCode ? router.replace(`/sinav/${f.activeSittingCode}`) : (setError(null), start.mutate(f)))}
            />
          )
        ) : null
      }
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            <Text variant="heading-1">{d.title}</Text>
            <Text variant="body-m" color="secondary">
              {[t(`enums.exam_form_type.${d.formType}`), t('exam.questions', { n: d.questionCount }), t('exam.form.duration', { n: Math.round(d.effectiveDurationSeconds / 60) })].join(' · ')}
            </Text>
            {d.extraTimePercent ? <Text variant="caption" color="tertiary">{t('exam.form.extra', { p: d.extraTimePercent })}</Text> : null}
            {error ? <Banner tone="danger" message={error} /> : null}
            {locked ? <Banner tone="info" message={t('exam.form.lockedBody')} /> : null}
            {outOfQuota && !d.activeSittingCode ? <Banner tone="warning" message={t('exam.form.quotaOut')} /> : null}
            {d.activeSittingCode ? <Banner tone="info" message={t('exam.form.active')} /> : null}
            {d.quota && d.quota.limit != null && !outOfQuota ? (
              <Text variant="caption" color="secondary">{t('exam.form.quota', { n: d.quota.remaining })}</Text>
            ) : null}
            {d.modes?.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {d.modes.map((m) => (
                  <Chip key={m} label={t(`enums.study_mode.${m}`)} selected={(mode ?? d.defaultMode) === m} onPress={() => setMode(m)} />
                ))}
              </View>
            ) : null}
            <View style={{ gap: 4 }}>
              <Text variant="heading-3">{t('exam.form.rules')}</Text>
              {[
                d.rules?.canPause ? t('exam.form.rule.canPause') : t('exam.form.rule.noPause'),
                d.rules?.canChangeAnswers ? t('exam.form.rule.changeAnswers') : null,
                d.rules?.blankPenalty ? null : t('exam.form.rule.blank'),
                d.rules?.wrongPenalty ? t('exam.form.rule.wrong') : null,
                t('exam.form.tutorOff'),
              ].filter(Boolean).map((r) => (
                <Text key={r} variant="body-m" color="secondary">{`• ${r}`}</Text>
              ))}
            </View>
            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('exam.form.sections')}</Text>
              {d.sections.map((s, i) => (
                <ListRow
                  key={s.typeKey}
                  title={t('exam.form.section', { name: s.name, from: s.firstQuestionNo, to: s.lastQuestionNo })}
                  value={String(s.questionCount)}
                  chevron={false}
                  divider={i < d.sections.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
