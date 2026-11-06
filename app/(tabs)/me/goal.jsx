import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Banner,
  Button,
  Card,
  Chip,
  ListRow,
  QueryBoundary,
  Screen,
  Segmented,
  Text,
  TextField,
  TopBar,
  useToast,
} from '@components';
import { api } from '@api';
import { errorText, formatDate, todayKey, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';

const MODES = ['session', 'custom', 'unknown'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Hedef: hedef puan (hazır seçenek ya da özel) ve sınav tarihi (oturum / özel tarih / belirsiz). */
export default function Goal() {
  const { t } = useT();
  const enrollment = useQuery({
    queryKey: queryKeys.learning.enrollment(),
    queryFn: async () => unwrap(await api.learningEnrollmentActiveGet()).enrollment,
  });
  const e = enrollment.data;
  const track = useQuery({
    queryKey: queryKeys.content.track(e?.track?.key),
    enabled: Boolean(e?.track?.key),
    queryFn: async () => unwrap(await api.contentPublicTrackGet(e.track.key)),
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  return (
    <Screen header={<TopBar title={t('goal.title')} onBack={back} />} edges={['bottom']}>
      <QueryBoundary query={enrollment}>
        {() =>
          !e ? (
            <Banner
              tone="info"
              message={t('goal.none')}
              action={{ label: t('goal.choose'), onPress: () => router.push('/onboarding') }}
            />
          ) : (
            <GoalForm e={e} track={track.data} />
          )
        }
      </QueryBoundary>
    </Screen>
  );
}

function GoalForm({ e, track }) {
  const { t, language } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const [score, setScore] = useState(String(e.targetScore ?? ''));
  const [dateMode, setDateMode] = useState(e.dateMode || 'unknown');
  const [session, setSession] = useState(e.examSession?.key || '');
  const [custom, setCustom] = useState(e.customExamDate || '');

  const max = e.scoreMax || 100;
  const today = todayKey();
  const sessions = (track?.sessions || []).filter(
    (s) => !['held', 'results_announced', 'cancelled'].includes(s.status) && s.examDate >= today,
  );
  const n = Number(score);
  const valid =
    Number.isInteger(n) &&
    n >= 1 &&
    n <= max &&
    (dateMode === 'unknown' ||
      (dateMode === 'session' && session) ||
      (dateMode === 'custom' && DATE.test(custom) && custom >= today));
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.learningEnrollmentUpdate(e.code, {
          targetScore: n,
          dateMode,
          ...(dateMode === 'session' ? { examSessionKey: session } : {}),
          ...(dateMode === 'custom' ? { customExamDate: custom } : {}),
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.learning.enrollment() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.progress(7) });
      toast.show({ message: t('goal.saved'), tone: 'success' });
      router.back();
    },
    onError: (err) => toast.show({ message: errorText(t, err), tone: 'danger' }),
  });

  return (
    <View style={{ gap: 20 }}>
      <Text variant="body-m" color="secondary">
        {e.track?.name}
      </Text>
      <View style={{ gap: 8 }}>
        <Text variant="heading-3">{t('goal.score', { max })}</Text>
        {track?.goalPresets?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {track.goalPresets.map((p) => (
              <Chip
                key={p.targetScore}
                label={String(p.targetScore)}
                selected={n === p.targetScore}
                onPress={() => setScore(String(p.targetScore))}
              />
            ))}
          </View>
        ) : null}
        <TextField
          label={t('goal.customScore')}
          value={score}
          onChangeText={(v) => setScore(v.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          maxLength={3}
        />
        {n > 0 && n <= max && e.questionCount ? (
          <Text variant="caption" color="tertiary">
            {t('goal.needed', { n: Math.ceil((n / max) * e.questionCount) })}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="heading-3">{t('goal.date')}</Text>
        <Segmented
          value={dateMode}
          onChange={setDateMode}
          options={MODES.map((m) => ({ value: m, label: t(`goal.mode.${m}`) }))}
        />
        {dateMode === 'session' ? (
          sessions.length ? (
            <Card style={{ padding: 0 }}>
              {sessions.map((s, i) => (
                <ListRow
                  key={s.key}
                  title={s.name}
                  subtitle={formatDate(s.examDate, language, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  value={session === s.key ? t('goal.selected') : undefined}
                  onPress={() => setSession(s.key)}
                  chevron={false}
                  divider={i < sessions.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Text variant="body-s" color="secondary">
              {t('goal.noSessions')}
            </Text>
          )
        ) : null}
        {dateMode === 'custom' ? (
          <TextField
            label={t('goal.customDate')}
            value={custom}
            onChangeText={(v) => setCustom(v.replace(/[^\d-]/g, '').slice(0, 10))}
            placeholder="2027-03-28"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        ) : null}
        {e.daysToExam != null ? (
          <Text variant="caption" color="tertiary">
            {t('goal.daysLeft', { n: e.daysToExam })}
          </Text>
        ) : null}
      </View>
      <Button
        title={t('goal.save')}
        disabled={!valid}
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
    </View>
  );
}
