import { router, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Banner, Button, Card, Chip, ListRow, QueryBoundary, Screen, Text, TextField, TopBar } from '@components';
import { api } from '@api';
import { errorText, formatDate, todayKey, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { onboardingRoute } from '@shared/navigation/onboardingRoute';
import { backToWelcome } from '@shared/navigation/backToWelcome';
import { useT } from '@shared/translation/useT';

function TrackStep({ exams, trackKey, onPick }) {
  const tracks = exams.flatMap((e) => e.tracks.filter((tr) => tr.status === 'active').map((tr) => ({ ...tr, exam: e })));
  return (
    <View style={{ gap: 8 }}>
      {tracks.map((tr) => (
        <Card key={tr.key} selected={trackKey === tr.key} onPress={() => onPick(tr.key)} accessibilityLabel={tr.name}>
          <Text variant="title">{tr.name}</Text>
          <Text variant="body-s" color="secondary">
            {tr.exam.shortName} · {tr.exam.providerName}
          </Text>
          {tr.notice ? (
            <Text variant="caption" color="tertiary">
              {tr.notice}
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

export default function OnboardingStart() {
  const { t, language } = useT();
  const qc = useQueryClient();
  const [trackKey, setTrackKey] = useState(null);
  const [score, setScore] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [dateChoice, setDateChoice] = useState('unknown'); // 'unknown' | 'custom' | oturum anahtarı
  const [customDate, setCustomDate] = useState('');
  const [error, setError] = useState(null);

  // Android geri tuşu uygulamayı kapatmasın; karşılamaya dönsün.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        backToWelcome();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const exams = useQuery({
    queryKey: queryKeys.content.exams(),
    queryFn: async () => unwrap(await api.contentPublicExamsList()).items,
  });
  const track = useQuery({
    queryKey: queryKeys.content.track(trackKey),
    enabled: Boolean(trackKey),
    queryFn: async () => unwrap(await api.contentPublicTrackGet(trackKey)),
  });

  const detail = track.data;
  const presets = detail?.goalPresets || [];
  // Geçmiş oturumlar (yapıldı / sonuç açıklandı) ve iptaller seçilemez; durum gece işiyle güncellenir, tarih de denetlenir.
  const today = todayKey();
  const upcoming = (detail?.sessions || []).filter((s) => !['held', 'results_announced', 'cancelled'].includes(s.status) && s.examDate >= today);
  const effectiveScore = score ?? presets.find((p) => p.isDefault)?.targetScore ?? null;

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        trackKey,
        ...(effectiveScore ? { targetScore: effectiveScore } : {}),
        dateMode: dateChoice === 'unknown' ? 'unknown' : dateChoice === 'custom' ? 'custom' : 'session',
        ...(dateChoice === 'custom' ? { customExamDate: customDate } : {}),
        ...(dateChoice !== 'unknown' && dateChoice !== 'custom' ? { examSessionKey: dateChoice } : {}),
        ...(reasons.length ? { goalReasonKeys: reasons } : {}),
      };
      return unwrap(await api.learningEnrollmentCreate(body)).enrollment;
    },
    onSuccess: (enrollment) => {
      qc.invalidateQueries({ queryKey: queryKeys.learning.enrollment() });
      router.replace(onboardingRoute({ ...enrollment, availability: [] }));
    },
    onError: (e) => setError(errorText(t, e)),
  });

  return (
    <Screen
      header={<TopBar title={t('onb.step', { n: 1, total: 3 })} onBack={backToWelcome} />}
      edges={['bottom']}
      footer={
        <Button
          title={t('onb.save')}
          disabled={!trackKey || !detail || (dateChoice === 'custom' && !(/^\d{4}-\d{2}-\d{2}$/.test(customDate) && customDate >= today))}
          loading={save.isPending}
          onPress={() => {
            setError(null);
            save.mutate();
          }}
        />
      }
    >
      <View style={{ gap: 24 }}>
        <View style={{ gap: 4 }}>
          <Text variant="display-m" accessibilityRole="header">
            {t('onb.exam.title')}
          </Text>
          <Text variant="body-l" color="secondary">
            {t('onb.exam.subtitle')}
          </Text>
        </View>
        {error ? <Banner tone="danger" message={error} /> : null}
        <QueryBoundary query={exams}>
          {(items) => <TrackStep exams={items} trackKey={trackKey} onPick={(k) => { setTrackKey(k); setScore(null); setDateChoice('unknown'); setReasons([]); }} />}
        </QueryBoundary>

        {trackKey ? (
          <QueryBoundary query={track}>
            {(d) => (
              <>
                <View style={{ gap: 8 }}>
                  <Text variant="heading-2">{t('onb.target.title')}</Text>
                  <Text variant="body-m" color="secondary">
                    {t('onb.target.subtitle')}
                  </Text>
                  {d.goalPresets.map((p) => (
                    <Card
                      key={p.targetScore}
                      selected={effectiveScore === p.targetScore}
                      onPress={() => setScore(p.targetScore)}
                      accessibilityLabel={`${p.label}, ${t('onb.target.score', { score: p.targetScore })}`}
                    >
                      <Text variant="title">{t('onb.target.score', { score: p.targetScore })}</Text>
                      <Text variant="body-s" color="secondary">
                        {p.label} — {p.description}
                      </Text>
                    </Card>
                  ))}
                </View>

                <TextField
                  label={t('onb.target.custom', { max: d.scoreMax || 100 })}
                  value={effectiveScore ? String(effectiveScore) : ''}
                  onChangeText={(v) => {
                    const num = Number(v.replace(/\D/g, '').slice(0, 3));
                    setScore(num > 0 ? Math.min(num, d.scoreMax || 100) : null);
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                />

                {d.goalReasons?.length ? (
                  <View style={{ gap: 8 }}>
                    <Text variant="heading-3">{t('onb.reasons.title')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {d.goalReasons.map((r) => (
                        <Chip
                          key={r.key}
                          label={r.label}
                          selected={reasons.includes(r.key)}
                          onPress={() =>
                            setReasons((cur) => (cur.includes(r.key) ? cur.filter((x) => x !== r.key) : [...cur, r.key]))
                          }
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={{ gap: 4 }}>
                  <Text variant="heading-2">{t('onb.date.title')}</Text>
                  {upcoming.map((s) => (
                    <ListRow
                      key={s.key}
                      title={s.name}
                      subtitle={formatDate(s.examDate, language, { day: 'numeric', month: 'long', year: 'numeric' })}
                      selected={dateChoice === s.key}
                      onPress={() => setDateChoice(s.key)}
                      chevron={false}
                      trailing={dateChoice === s.key ? <Text color="accent">✓</Text> : null}
                      divider
                    />
                  ))}
                  <ListRow
                    title={t('onb.date.custom')}
                    subtitle={t('onb.date.customHint')}
                    selected={dateChoice === 'custom'}
                    onPress={() => setDateChoice('custom')}
                    chevron={false}
                    trailing={dateChoice === 'custom' ? <Text color="accent">✓</Text> : null}
                    divider
                  />
                  {dateChoice === 'custom' ? (
                    <TextField
                      label={t('goal.customDate')}
                      value={customDate}
                      onChangeText={(v) => setCustomDate(v.replace(/[^\d-]/g, '').slice(0, 10))}
                      placeholder="2027-03-28"
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                    />
                  ) : null}
                  <ListRow
                    title={t('onb.date.unknown')}
                    subtitle={t('onb.date.unknownHint')}
                    selected={dateChoice === 'unknown'}
                    onPress={() => setDateChoice('unknown')}
                    chevron={false}
                    trailing={dateChoice === 'unknown' ? <Text color="accent">✓</Text> : null}
                  />
                </View>
              </>
            )}
          </QueryBoundary>
        ) : null}
      </View>
    </Screen>
  );
}
