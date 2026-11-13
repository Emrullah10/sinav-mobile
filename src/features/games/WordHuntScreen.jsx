import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Banner, BubbleLoader, Button, Card, Screen, Text, TopBar } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { WORD_HUNT_DURATION_MS, WORD_HUNT_MIN_LEN, huntPathWord } from '@shared/vendor/domain/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { HuntResult } from './HuntResult';
import { WordHuntBoard } from './WordHuntBoard';
import { useGamePlay } from './useGamePlay';
import { sendMove } from './moves';
import { LevelGoal, LevelReward } from './LevelStrip';
import { MarathonHud } from './MarathonHud';
import { MatchBar } from './MatchBar';

/** Kelime Avı: süre sunucuda tutulur, hamleler sunucuda doğrulanır. */
export function WordHuntScreen({ kind, level, matchCode }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const { play, setPlay, error, skew, blocked, again, match } = useGamePlay('word_hunt', kind, level, matchCode);
  const hub = useQuery({ queryKey: queryKeys.games.hub(), queryFn: async () => unwrap(await api.gamesHubGet()), staleTime: 30_000 });

  const [now, setNow] = useState(() => Date.now());
  const [path, setPath] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);
  const finishing = useRef(false);
  const clearTimer = useRef(null);

  const finished = Boolean(play) && play.status !== 'active';
  useEffect(() => {
    if (!play || finished) return undefined;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [play, finished]);

  const serverNow = now + skew;
  const startsAt = play ? Date.parse(play.startsAt) : 0;
  const endsAt = play ? Date.parse(play.endsAt) : 0;
  const durMs = play ? endsAt - startsAt : WORD_HUNT_DURATION_MS;
  const phase = !play ? 'load' : finished ? 'done' : serverNow < startsAt ? 'lead' : serverNow < endsAt ? 'play' : 'ending';
  const left = Math.max(0, Math.ceil((endsAt - serverNow) / 1000));

  const move = useMutation({ mutationFn: async ({ code, body }) => unwrap(await sendMove(play, code, body)) });

  const settle = useCallback((fb, text) => {
    setFeedback(fb);
    setMessage(text || '');
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => { setFeedback(null); setPath([]); setMessage(''); }, 420);
  }, []);

  const submit = useCallback((p) => {
    if (phase !== 'play') return;
    if (p.length < WORD_HUNT_MIN_LEN) { settle('bad', t('apiErrors.GAMES_WORD_TOO_SHORT', { min: WORD_HUNT_MIN_LEN })); haptics.warning(); return; }
    setPath(p);
    move.mutate({ code: play.code, body: { path: p } }, {
      onSuccess: (d) => {
        setPlay((prev) => (d.play.found.length >= (prev?.found.length ?? 0) ? d.play : prev));
        if (d.stats) setStats(d.stats);
        settle('ok');
        haptics.correct();
        if (d.play.status !== 'active') qc.invalidateQueries({ queryKey: queryKeys.games.hub() });
      },
      onError: (e) => { settle('bad', errorText(t, e)); haptics.warning(); },
    });
  }, [phase, play, move, setPlay, settle, qc, t, haptics]);

  useEffect(() => {
    if (phase !== 'ending' || finishing.current) return;
    finishing.current = true;
    move.mutate({ code: play.code, body: { finish: true } }, {
      onSuccess: (d) => { setPlay(d.play); if (d.stats) setStats(d.stats); qc.invalidateQueries({ queryKey: queryKeys.games.hub() }); haptics.success(); },
    });
  }, [phase, play, move, setPlay, qc, haptics]);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const hubStats = hub.data?.games?.find((g) => g.key === 'word_hunt')?.stats || null;
  const quota = hub.data?.quota;
  const back = () => router.back();
  const header = <TopBar variant="standard" title={kind === 'daily' ? t('games.daily') : kind === 'marathon' ? t('games.marathon.label') : kind === 'level' ? t('games.level.label', { n: level }) : kind === 'match' ? t('games.match.label') : t('games.freePlay')} onBack={back} />;

  if (error) {
    const quotaOut = apiErrorCode(error) === 'QUOTA_EXCEEDED';
    return (
      <Screen header={header}>
        <Card style={{ gap: 12, alignItems: 'center', marginTop: 24 }}>
          <Text variant="heading-3" align="center">{quotaOut ? t('games.quotaNone') : errorText(t, error)}</Text>
          {quotaOut ? <Text variant="body-m" color="secondary" align="center">{t('games.result.noMore')}</Text> : null}
          {quotaOut ? <Button title={t('pay.tier.premium')} onPress={() => router.push('/premium')} /> : null}
          <Button title={t('games.result.hub')} variant={quotaOut ? 'secondary' : 'primary'} onPress={back} />
        </Card>
      </Screen>
    );
  }
  if (!play) return <Screen header={header}><BubbleLoader label={t('games.loading')} /></Screen>;

  const points = play.found.reduce((a, f) => a + f.points, 0);
  const lead = Math.max(0, Math.ceil((startsAt - serverNow) / 1000));
  const word = path.length ? huntPathWord(play.grid, path) : '';
  const frac = phase === 'lead' ? 1 : Math.max(0, (endsAt - serverNow) / durMs);

  return (
    <Screen header={header} contentContainerStyle={{ alignItems: 'center', gap: 12, paddingBottom: 24 }}>
      {match ? <MatchBar match={match} /> : null}
      <LevelGoal play={play} />
      <MarathonHud play={play} setPlay={setPlay} />
      {play.status !== 'active' ? <LevelReward play={play} /> : null}
      {phase === 'done' && play.kind === 'marathon' ? null : phase === 'done' ? (
        <HuntResult play={play} stats={stats || hubStats} onAgain={again} againBlocked={blocked || (quota && quota.limit !== null && quota.remaining === 0)} onHub={back} />
      ) : (
        <>
          <View style={{ width: '100%', maxWidth: 420, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="title">{t('games.hunt.points', { n: points })}</Text>
              <Text variant="heading-3" accessibilityRole="timer">{t('games.hunt.timeLeft', { n: phase === 'lead' ? durMs / 1000 : left })}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border.default, overflow: 'hidden' }}>
              <View style={{ width: `${frac * 100}%`, height: '100%', borderRadius: 4, backgroundColor: left <= 10 && phase === 'play' ? colors.danger.fg : colors.accent.default }} />
            </View>
          </View>
          <Text style={{ minHeight: 38, fontSize: 26, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', color: feedback === 'ok' ? colors.success.fg : feedback === 'bad' ? colors.danger.fg : colors.text.primary }}>{word || ' '}</Text>
          <View style={{ minHeight: 44, width: '100%', maxWidth: 420 }} accessibilityLiveRegion="polite">
            {message ? <Banner tone="warning" message={message} /> : null}
          </View>
          <View>
            <WordHuntBoard grid={play.grid} size={play.size} path={path} onPath={(p) => { setFeedback(null); setPath(p); }} onSubmit={submit} disabled={phase !== 'play'} feedback={feedback} />
            {phase === 'lead' ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, backgroundColor: `${colors.bg.canvas}D9` }}>
                <Text style={{ fontSize: 64, fontWeight: '800' }}>{lead > 0 ? lead : t('games.hunt.go')}</Text>
                <Text variant="label-l" color="secondary">{t('games.hunt.ready')}</Text>
              </View>
            ) : null}
          </View>
          {phase === 'lead' ? <Text variant="body-s" color="secondary" align="center" style={{ maxWidth: 440 }}>{t('games.hunt.how')}</Text> : null}
          <View style={{ gap: 6, width: '100%', alignItems: 'center' }}>
            <Text variant="caption" color="secondary">{t('games.hunt.found', { n: play.found.length })}</Text>
            {play.found.length === 0 ? <Text variant="body-s" color="secondary">{t('games.hunt.noneYet')}</Text> : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {[...play.found].reverse().map((f) => (
                  <View key={f.word} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.success.bg }}>
                    <Text variant="label-m" style={{ color: colors.success.fg }}>{f.word}</Text>
                    <Text variant="caption" style={{ color: colors.success.fg, opacity: 0.75 }}>{f.points}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
