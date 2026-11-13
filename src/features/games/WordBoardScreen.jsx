import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Flag, Repeat, RotateCcw, Share2, Shuffle, Trophy, Undo2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Share, View, useWindowDimensions } from 'react-native';
import { Banner, BubbleLoader, Button, Card, Screen, Text, TopBar } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { BOARD_EMPTY, BOARD_LETTER_VALUES, BOARD_SIZE, boardPremium, evaluateBoardMove } from '@shared/vendor/domain/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useGamePlay } from './useGamePlay';
import { sendMove } from './moves';
import { LevelGoal, LevelReward } from './LevelStrip';
import { MarathonHud } from './MarathonHud';
import { MatchBar } from './MatchBar';

const GAP = 2;

/** Harf Tahtası (tek kişilik tur). Taşa dokun, sonra kareye dokun. Torba ve doğrulama sunucuda. */
export function WordBoardScreen({ kind, level, matchCode }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const { play, setPlay, error, blocked, again, match } = useGamePlay('word_board', kind, level, matchCode);
  const hub = useQuery({ queryKey: queryKeys.games.hub(), queryFn: async () => unwrap(await api.gamesHubGet()), staleTime: 30_000 });

  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState({});
  const [swapMode, setSwapMode] = useState(false);
  const [swapSel, setSwapSel] = useState([]);
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);

  const move = useMutation({
    mutationFn: async ({ code, body }) => unwrap(await sendMove(play, code, body)),
    onSuccess: (d) => {
      setPlay(d.play);
      setPending({}); setSelected(null); setSwapMode(false); setSwapSel([]); setOrder(null); setMessage('');
      haptics.success();
      if (d.play.status !== 'active') qc.invalidateQueries({ queryKey: queryKeys.games.hub() });
    },
    onError: (e) => { setMessage(errorText(t, e)); haptics.warning(); },
  });

  const rack = useMemo(() => play?.rack || [], [play]);
  const rackOrder = order && order.length === rack.length ? order : rack.map((_, i) => i);
  const placements = useMemo(
    () => Object.entries(pending).map(([cell, ri]) => ({ r: Math.floor(cell / BOARD_SIZE), c: cell % BOARD_SIZE, l: rack[ri] })),
    [pending, rack],
  );
  const preview = useMemo(() => (play && placements.length ? evaluateBoardMove(play.board, placements) : null), [play, placements]);

  const hubStats = hub.data?.games?.find((g) => g.key === 'word_board')?.stats || null;
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

  const finished = play.status !== 'active';
  const isMatch = play.kind === 'match';
  const frozen = finished || (isMatch && !play.myTurn);
  const used = new Set(Object.values(pending));
  const cell = Math.floor((Math.min(width, 520) - 32 - 12 - GAP * (BOARD_SIZE - 1)) / BOARD_SIZE);
  const fresh = new Set(play.lastCells);
  const last = play.history.at(-1);

  const onRack = (i) => {
    if (frozen) return;
    haptics.tap();
    if (swapMode) { setSwapSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])); return; }
    if (used.has(i)) return;
    setSelected((s) => (s === i ? null : i));
  };
  const onCell = (c) => {
    if (frozen || swapMode || play.board[c] !== BOARD_EMPTY) return;
    if (pending[c] !== undefined) { setPending(({ [c]: _gone, ...rest }) => rest); return; }
    if (selected === null) return;
    haptics.select();
    setPending((p) => ({ ...p, [c]: selected }));
    setSelected(null);
    setMessage('');
  };
  const end = () => {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 4000); return; }
    move.mutate({ code: play.code, body: { finish: true } });
  };
  const share = async () => {
    try { await Share.share({ message: t('games.board.share', { date: play.puzzleDate || '', n: play.total }) }); } catch { /* vazgeçildi */ }
  };
  const premStyle = (p) => ({
    tw: { bg: colors.danger.bg, fg: colors.danger.fg },
    dw: { bg: colors.warning.bg, fg: colors.warning.fg },
    tl: { bg: colors.tint['indigo-bg'], fg: colors.tint.indigo },
    dl: { bg: colors.tint['teal-bg'], fg: colors.tint.teal },
  }[p]);

  return (
    <Screen header={header} contentContainerStyle={{ alignItems: 'center', gap: 12, paddingBottom: 24 }}>
      {match ? <MatchBar match={match} /> : null}
      <LevelGoal play={play} />
      <MarathonHud play={play} setPlay={setPlay} />
      {play.status !== 'active' ? <LevelReward play={play} /> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', maxWidth: 520 }}>
        <Text variant="title">{t('games.board.total', { n: play.total })}</Text>
        <Text variant="body-s" color="secondary">{isMatch ? (finished ? '' : `${play.myTurn ? t('games.match.yourTurn') : t('games.match.theirTurn')} · `) : `${t('games.board.move', { n: Math.min(play.moves + (finished ? 0 : 1), play.maxMoves), max: play.maxMoves })} · `}{t('games.board.bag', { n: play.bagCount })}</Text>
      </View>

      <View accessibilityLabel="Board" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, padding: 6, borderRadius: radius.lg, backgroundColor: colors.bg.canvas, width: cell * BOARD_SIZE + GAP * (BOARD_SIZE - 1) + 12 }}>
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, c) => {
          const onBoard = play.board[c] !== BOARD_EMPTY;
          const ch = onBoard ? play.board[c] : pending[c] !== undefined ? rack[pending[c]] : '';
          const prem = boardPremium(c);
          const ps = prem && !ch ? premStyle(prem) : null;
          const isPending = pending[c] !== undefined;
          return (
            <Pressable
              key={c}
              onPress={() => onCell(c)}
              disabled={frozen || onBoard}
              accessibilityRole="button"
              accessibilityLabel={ch ? ch.toUpperCase() : prem ? t(`games.board.prem.${prem}`) : ' '}
              style={{
                width: cell, height: cell, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
                backgroundColor: onBoard ? colors.accent['subtle-bg'] : isPending ? colors.bg.surface : ps ? ps.bg : c === 60 ? colors.warning.bg : colors.bg.surface,
                borderWidth: isPending ? 2 : onBoard && fresh.has(c) ? 2 : 0,
                borderStyle: isPending ? 'dashed' : 'solid',
                borderColor: isPending ? colors.accent.default : colors.success.fg,
              }}
            >
              {ch ? (
                <>
                  <Text allowFontScaling={false} style={{ fontSize: cell * 0.5, lineHeight: cell * 0.62, fontWeight: '800', textTransform: 'uppercase', color: onBoard ? colors.accent['subtle-fg'] : colors.text.primary }}>{ch}</Text>
                  <Text allowFontScaling={false} style={{ position: 'absolute', right: 2, bottom: 0, fontSize: cell * 0.26, fontWeight: '700', color: colors.text.secondary }}>{BOARD_LETTER_VALUES[ch]}</Text>
                </>
              ) : prem ? (
                <Text allowFontScaling={false} style={{ fontSize: cell * 0.3, fontWeight: '700', color: ps.fg }}>{t(`games.board.prem.${prem}`)}</Text>
              ) : c === 60 ? <Text allowFontScaling={false} style={{ fontSize: cell * 0.4, color: colors.warning.fg }}>★</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {!finished ? (
        <>
          <View style={{ minHeight: 44, width: '100%', maxWidth: 520, justifyContent: 'center' }} accessibilityLiveRegion="polite">
            {message ? <Banner tone="warning" message={message} /> : swapMode ? <Text variant="body-s" color="secondary" align="center">{t('games.board.swapPick')}</Text> : preview ? (
              <Text variant="body-m" align="center" style={{ color: preview.ok ? colors.success.fg : colors.text.secondary, fontWeight: preview.ok ? '700' : '400' }}>
                {preview.ok ? `${t('games.board.preview', { n: preview.score })} · ${preview.words.map((w) => w.word).join(', ')}` : t('games.board.previewBad')}
              </Text>
            ) : last ? (
              <Text variant="body-s" color="secondary" align="center">{t('games.board.lastMove')}: {last.pass ? t('games.match.passed') : last.swap ? t('games.board.swapped', { n: last.swap }) : `${last.words.join(', ')} +${last.score}${last.full ? ` (${t('games.board.bonusFull')})` : ''}`}</Text>
            ) : <Text variant="body-s" color="secondary" align="center">{isMatch ? t('games.match.boardHow') : t('games.board.how', { max: play.maxMoves })}</Text>}
          </View>

          <View accessibilityLabel={t('games.board.rack')} style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {rackOrder.map((i) => {
              const sel = selected === i;
              const sw = swapMode && swapSel.includes(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => onRack(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel || sw }}
                  accessibilityLabel={`${rack[i].toUpperCase()} ${BOARD_LETTER_VALUES[rack[i]]}`}
                  style={{
                    width: 44, height: 50, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                    borderColor: sw ? colors.warning.fg : colors.accent.default,
                    backgroundColor: sel ? colors.accent.default : sw ? colors.warning.bg : colors.accent['subtle-bg'],
                    opacity: used.has(i) ? 0.25 : 1, transform: [{ translateY: sel || sw ? -6 : 0 }],
                  }}
                >
                  <Text allowFontScaling={false} style={{ fontSize: 24, lineHeight: 30, fontWeight: '800', textTransform: 'uppercase', color: sel ? colors.text['on-accent'] : sw ? colors.warning.fg : colors.accent['subtle-fg'] }}>{rack[i]}</Text>
                  <Text allowFontScaling={false} style={{ position: 'absolute', right: 4, bottom: 1, fontSize: 10, fontWeight: '700', color: sel ? colors.text['on-accent'] : colors.text.secondary }}>{BOARD_LETTER_VALUES[rack[i]]}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 8, width: '100%', maxWidth: 520 }}>
            {swapMode ? (
              <>
                <Button title={t('games.board.swapConfirm', { n: swapSel.length })} disabled={!swapSel.length || move.isPending} loading={move.isPending} onPress={() => move.mutate({ code: play.code, body: { swap: swapSel.map((i) => rack[i]).join('') } })} />
                <Button title={t('games.board.cancel')} variant="tertiary" onPress={() => { setSwapMode(false); setSwapSel([]); }} />
              </>
            ) : (
              <>
                <Button title={t('games.board.submit')} leftIcon={Check} disabled={frozen || !placements.length || move.isPending} loading={move.isPending} onPress={() => move.mutate({ code: play.code, body: { place: placements } })} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Button title={t('games.board.recall')} size="md" variant="secondary" leftIcon={Undo2} disabled={!placements.length} onPress={() => { setPending({}); setSelected(null); }} /></View>
                  <View style={{ flex: 1 }}><Button title={t('games.board.shuffle')} size="md" variant="secondary" leftIcon={Shuffle} onPress={() => setOrder([...rackOrder].sort(() => Math.random() - 0.5))} /></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Button title={t('games.board.swap')} size="md" variant="secondary" leftIcon={Repeat} disabled={frozen || play.bagCount === 0 || Boolean(placements.length)} onPress={() => { setSwapMode(true); setSelected(null); }} /></View>
                  <View style={{ flex: 1 }}>{isMatch ? <Button title={t('games.match.pass')} size="md" variant="tertiary" leftIcon={Flag} disabled={frozen || move.isPending} onPress={() => move.mutate({ code: play.code, body: { pass: true } })} /> : <Button title={confirmEnd ? `${t('games.board.finish')}?` : t('games.board.finish')} size="md" variant="tertiary" leftIcon={Flag} onPress={end} />}</View>
                </View>
              </>
            )}
            <Text variant="caption" color="secondary" align="center">{t('games.board.legend')}</Text>
          </View>
        </>
      ) : play.kind === 'marathon' ? null : (
        <Card elevation="e1" style={{ gap: 12, alignItems: 'center', width: '100%', maxWidth: 520 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success.bg }}>
            <Trophy size={22} color={colors.success.fg} />
          </View>
          <Text variant="heading-2">{t('games.board.result.title')}</Text>
          <Text variant="body-m" color="secondary">{t('games.board.result.score', { n: play.score })}</Text>
          {play.history.length ? (
            <View style={{ gap: 4, alignSelf: 'stretch' }}>
              <Text variant="caption" color="secondary">{t('games.board.history')}</Text>
              {play.history.map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="body-s" style={{ flex: 1 }}>{h.pass ? t('games.match.passed') : h.swap ? t('games.board.swapped', { n: h.swap }) : (h.words || []).join(', ')}</Text>
                  {h.swap ? null : <Text variant="label-m" style={{ color: colors.success.fg }}>+{h.score}</Text>}
                </View>
              ))}
            </View>
          ) : null}
          {hubStats ? <Text variant="body-s" color="secondary">{t('games.stats.best')}: {hubStats.bestScore}</Text> : null}
          {blocked ? <Text variant="body-s" color="secondary">{t('games.result.noMore')}</Text> : null}
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            {play.kind === 'free' ? <Button title={t('games.result.again')} leftIcon={RotateCcw} onPress={again} disabled={blocked || (quota && quota.limit !== null && quota.remaining === 0)} /> : null}
            <Button title={t('games.result.share')} variant="secondary" leftIcon={Share2} onPress={share} />
            <Button title={t('games.result.hub')} variant="tertiary" onPress={back} />
          </View>
        </Card>
      )}
    </Screen>
  );
}
