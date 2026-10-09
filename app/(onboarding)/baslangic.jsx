import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Chip, ListRow, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { errorText, formatDate, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { onboardingRoute } from '@shared/navigation/onboardingRoute';
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
  const [dateChoice, setDateChoice] = useState('unknown'); // 'unknown' | oturum anahtarı
  const [error, setError] = useState(null);

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
  const upcoming = (detail?.sessions || []).filter((s) => s.status !== 'held' && s.status !== 'canceled');
  const effectiveScore = score ?? presets.find((p) => p.isDefault)?.targetScore ?? null;

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        trackKey,
        ...(effectiveScore ? { targetScore: effectiveScore } : {}),
        dateMode: dateChoice === 'unknown' ? 'unknown' : 'session',
        ...(dateChoice !== 'unknown' ? { examSessionKey: dateChoice } : {}),
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
      header={<TopBar title={t('onb.step', { n: 1, total: 3 })} />}
      edges={['bottom']}
      footer={
        <Button
          title={t('onb.save')}
          disabled={!trackKey || !detail}
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
