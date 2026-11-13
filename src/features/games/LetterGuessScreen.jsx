import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Banner, BubbleLoader, Button, Card, Screen, Text, TopBar } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { keyboardState } from '@shared/vendor/domain/index.js';
import { useT } from '@shared/translation/useT';
import { LetterGuessBoard } from './LetterGuessBoard';
import { LetterGuessKeyboard } from './LetterGuessKeyboard';
import { ResultCard } from './ResultCard';
import { sendMove } from './moves';
import { LevelGoal, LevelReward } from './LevelStrip';
import { MarathonHud } from './MarathonHud';
import { MatchBar } from './MatchBar';
import { useMatchPlay } from './useMatchPlay';

const REVEAL_MS = 5 * 140 + 480; // son harfin çevrilmesi bitene kadar

/** Harf Tahmini ekranı. Sunucu yetkili: gizli kelime yalnız oyun bitince gelir; tahmin doğrulaması sunucuda. */
export function LetterGuessScreen({ kind, level, matchCode }) {
  const { t } = useT();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const hub = useQuery({ queryKey: queryKeys.games.hub(), queryFn: async () => unwrap(await api.gamesHubGet()), staleTime: 30_000 });

  const mp = useMatchPlay(matchCode);
  const [ownPlay, setOwnPlay] = useState(null);
  const play = matchCode ? mp.play : ownPlay;
  const setPlay = matchCode ? mp.setPlay : setOwnPlay;
  const [startError, setStartError] = useState(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [shakeToken, setShakeToken] = useState(0);
  const [revealRow, setRevealRow] = useState(-1);
  const [stats, setStats] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [hintGone, setHintGone] = useState(false);

  const start = useMutation({
    mutationFn: async (vars) => unwrap(await api.gamesPlayStart(vars)),
    onSuccess: (d) => { setPlay(d.play); setStartError(null); setDraft(''); setStats(null); qc.invalidateQueries({ queryKey: queryKeys.games.hub() }); },
    onError: (e) => setStartError(e),
  });
  const begin = useCallback(() => start.mutate({ game: 'letter_guess', kind, level }), [start, kind, level]);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!matchCode) begin();
  }, [begin, matchCode]);

  const hintMut = useMutation({
    mutationFn: async ({ code }) => unwrap(await sendMove(play, code, { hint: true })),
    onSuccess: (d) => setPlay(d.play),
    onError: (e) => { setHintGone(true); setMessage(errorText(t, e)); },
  });
  const move = useMutation({
    mutationFn: async ({ code, guess }) => unwrap(await sendMove(play, code, { guess })),
    onSuccess: (d) => {
      setPlay(d.play);
      setDraft('');
      setMessage('');
      setRevealRow(d.play.guesses.length - 1);
      if (d.stats) setStats(d.stats);
      if (d.play.status === 'won') setTimeout(() => haptics.success(), REVEAL_MS);
      if (d.play.status !== 'active') qc.invalidateQueries({ queryKey: queryKeys.games.hub() });
    },
    onError: (e) => { setMessage(errorText(t, e)); setShakeToken((n) => n + 1); haptics.warning(); },
  });

  useEffect(() => {
    if (revealRow < 0) return undefined;
    const id = setTimeout(() => setRevealRow(-1), REVEAL_MS);
    return () => clearTimeout(id);
  }, [revealRow]);

  const len = play?.length || 5;
  const finished = Boolean(play) && play.status !== 'active';
  const revealing = revealRow >= 0;
  const canType = Boolean(play) && !finished && !revealing && !move.isPending;

  const onLetter = useCallback((ch) => { if (canType) { haptics.tap(); setMessage(''); setDraft((d) => (d.length < len ? d + ch : d)); } }, [canType, haptics, len]);
  const onDelete = useCallback(() => { if (canType) setDraft((d) => d.slice(0, -1)); }, [canType]);
  const onSubmit = useCallback(() => {
    if (!canType) return;
    if (draft.length < len) { setMessage(t('games.letterGuess.tooShortN', { n: len })); setShakeToken((n) => n + 1); haptics.warning(); return; }
    move.mutate({ code: play.code, guess: draft });
  }, [canType, draft, move, play, t, haptics, len]);

  const toMarks = (list) => list.map((g) => ({ letters: g.word, marks: g.marks }));
  const keys = useMemo(() => {
    const all = play?.guesses || [];
    return keyboardState(toMarks(revealing ? all.slice(0, -1) : all)); // renkler satır açılınca değişir
  }, [play, revealing]);

  const playAgain = () => {
    setBlocked(false);
    setPlay(null);
    setRevealRow(-1);
    setMessage('');
    start.mutate({ game: 'letter_guess', kind: kind === 'marathon' ? 'marathon' : 'free' }, { onError: (e) => { if (apiErrorCode(e) === 'QUOTA_EXCEEDED') setBlocked(true); } });
  };

  const hubGame = hub.data?.games?.find((g) => g.key === 'letter_guess');
  const quota = hub.data?.quota;
  const back = () => router.back();
  const header = (
    <TopBar
      variant="standard"
      title={kind === 'daily' ? t('games.daily') : kind === 'marathon' ? t('games.marathon.label') : kind === 'level' ? t('games.level.label', { n: level }) : kind === 'match' ? t('games.match.label') : t('games.freePlay')}
      onBack={back}
      right={hubGame?.stats?.currentStreak > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 }}>
          <Flame size={16} color="#93650B" />
          <Text variant="label-m">{hubGame.stats.currentStreak}</Text>
        </View>
      ) : null}
    />
  );

  if (startError) {
    const quotaOut = apiErrorCode(startError) === 'QUOTA_EXCEEDED';
    return (
      <Screen header={header}>
        <Card style={{ gap: 12, alignItems: 'center', marginTop: 24 }}>
          <Text variant="heading-3" align="center">{quotaOut ? t('games.quotaNone') : errorText(t, startError)}</Text>
          {quotaOut ? <Text variant="body-m" color="secondary" align="center">{t('games.result.noMore')}</Text> : null}
          {quotaOut ? <Button title={t('pay.tier.premium')} onPress={() => router.push('/premium')} /> : null}
          <Button title={t('games.result.hub')} variant={quotaOut ? 'secondary' : 'primary'} onPress={back} />
        </Card>
      </Screen>
    );
  }
  if (!play) return <Screen header={header}><BubbleLoader label={t('games.loading')} /></Screen>;

  return (
    <Screen header={header} contentContainerStyle={{ alignItems: 'center', gap: 14, paddingBottom: 24 }}>
      {mp.match ? <MatchBar match={mp.match} /> : null}
      <LevelGoal play={play} />
      <MarathonHud play={play} setPlay={setPlay} />
      {finished && !revealing ? <LevelReward play={play} /> : null}
      <Text variant="body-s" color="secondary" align="center" style={{ maxWidth: 440 }}>{play.guesses.length === 0 ? t('games.letterGuess.how') : t('games.letterGuess.info', { len, tries: play.maxTries })}</Text>
      {play.hint ? <Text variant="label-m" align="center" style={{ color: '#93650B' }}>{t('games.letterGuess.hintLabel', { text: play.hint })}</Text> : null}
      {!finished && !play.hint && !hintGone && play.hintAvailable && play.kind !== 'match' ? (
        <Button size="sm" variant="tertiary" loading={hintMut.isPending} title={`${t('games.letterGuess.hint')}${play.kind === 'level' ? ` · ${t('games.letterGuess.hintNote')}` : ''}`} onPress={() => hintMut.mutate({ code: play.code })} />
      ) : null}
      <View style={{ minHeight: 48, width: '100%', maxWidth: 440 }} accessibilityLiveRegion="polite">
        {message ? <Banner tone="warning" message={message} /> : null}
      </View>
      <LetterGuessBoard
        key={play.code}
        guesses={play.guesses}
        rows={play.maxTries}
        length={len}
        draft={draft}
        revealRow={revealRow}
        shakeToken={shakeToken}
        winRow={play.status === 'won' ? play.guesses.length - 1 : -1}
        active={!finished}
      />
      {finished && !revealing && play.kind === 'marathon' ? null : finished && !revealing ? (
        <ResultCard
          play={play}
          stats={stats || hubGame?.stats || null}
          onAgain={playAgain}
          againBlocked={blocked || (quota && quota.limit !== null && quota.remaining === 0)}
          onHub={back}
        />
      ) : (
        <>
          <LetterGuessKeyboard keys={keys} onLetter={onLetter} onDelete={onDelete} onSubmit={onSubmit} disabled={!canType} />
          <Text variant="caption" color="secondary" align="center">{t('games.letterGuess.legend')}</Text>
        </>
      )}
    </Screen>
  );
}
