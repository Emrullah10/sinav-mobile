import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Flag, Swords, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Button, Card, Text } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { byKey } from './games';
import { WordsToLearn } from './WordsToLearn';

const REACTIONS = ['gg', 'nice', 'wow', 'oops', 'hurry', 'rematch'];

// Rakibin ilerlemesi (içerik sızdırmaz).
function Progress({ game, view }) {
  const { t } = useT();
  const { colors } = useTheme();
  if (!view) return null;
  if (game === 'letter_guess') {
    const color = { correct: colors.success.fg, present: colors.tint.amber, absent: colors.bg.pressed };
    return (
      <View style={{ gap: 3 }} accessibilityLabel={t('games.match.tries', { n: view.tries })}>
        {view.rows.length === 0 ? <Text variant="body-s" color="secondary">{t('games.match.noGuess')}</Text> : view.rows.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 3 }}>{r.map((m, j) => <View key={j} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color[m] }} />)}</View>
        ))}
      </View>
    );
  }
  if (game === 'word_hunt') return <Text variant="body-m">{t('games.match.points', { n: view.points })} · {t('games.match.words', { n: view.words })}</Text>;
  if (game === 'closeness') return <Text variant="body-m">{view.bestRank ? t('games.match.bestRank', { n: view.bestRank }) : t('games.match.noGuess')} · {t('games.match.tries', { n: view.tries })}</Text>;
  return <Text variant="body-m">{t('games.match.points', { n: view.score })}</Text>;
}

// Maç başında 3-2-1 perdesi (yalnız yeni başlamış canlı maçta).
function Curtain({ match }) {
  const { t } = useT();
  const [n, setN] = useState(() => {
    if (match.mode !== 'live' || match.game === 'word_hunt' || match.status !== 'active') return 0;
    return Date.parse(match.serverNow) - Date.parse(match.startedAt) < 1500 ? 3 : 0;
  });
  useEffect(() => {
    if (n <= 0) return undefined;
    const id = setTimeout(() => setN((x) => x - 1), 800);
    return () => clearTimeout(id);
  }, [n]);
  return (
    <Modal visible={n > 0} transparent animationType="fade" accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Text allowFontScaling={false} style={{ fontSize: 96, fontWeight: '800', color: '#fff' }}>{n}</Text>
        <Text variant="body-m" style={{ color: '#fff' }}>{t('games.match.vs', { name: match.opponent?.name })}</Text>
      </View>
    </Modal>
  );
}

/** Maç şeridi: rakip + ilerleme, tepkiler, pes, maç sonu sonucu. */
export function MatchBar({ match }) {
  const { t } = useT();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: queryKeys.games.match(match.code) }); qc.invalidateQueries({ queryKey: queryKeys.games.hub() }); };
  const react = useMutation({ mutationFn: async (r) => unwrap(await api.gamesMatchReact(match.code, r)), onSuccess: refresh });
  const again = useMutation({ mutationFn: async () => unwrap(await api.gamesMatchmake(match.game)), onSuccess: (d) => router.replace(`/games/match/${d.match.code}`) });
  const resign = useMutation({ mutationFn: async () => unwrap(await api.gamesMatchResign(match.code)), onSuccess: refresh });
  const done = match.status === 'finished' || match.status === 'expired';
  const opp = match.opponent;
  const theirs = match.reactions.find((r) => !r.mine);
  const slug = byKey(match.game)?.slug;
  const myDone = match.mode === 'live' && match.me && match.me.status !== 'active';
  return (
    <Card style={{ gap: 8, width: '100%', maxWidth: 520 }}>
      <Curtain match={match} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Swords size={18} color={colors.text.primary} />
        <Text variant="title">{opp?.name}</Text>
        <Text variant="caption" color="secondary">Lv {opp?.level}</Text>
        {opp?.ghost ? <Text variant="label-s" color="secondary">{t('games.match.ghost')}</Text> : null}
        {opp?.view?.solved ? <Text variant="label-s" style={{ color: colors.success.fg }}>{t('games.match.solved')}</Text> : null}
      </View>
      <Progress game={match.game} view={opp?.view} />
      {theirs && !done ? <Text variant="label-m" accessibilityLiveRegion="polite">{t(`games.match.react.${theirs.code}`)}</Text> : null}
      {myDone && !done ? <Text variant="body-s" color="secondary" accessibilityLiveRegion="polite">{t('games.match.waitOpp')}</Text> : null}
      {done ? (
        <View style={{ alignItems: 'center', gap: 8 }} accessibilityRole="summary">
          <Text variant="heading-3" align="center">{match.status === 'expired' ? t('games.match.expired') : match.winner === 'me' ? t('games.match.youWon') : match.winner === 'draw' ? t('games.match.draw') : t('games.match.youLost')}</Text>
          {match.xpGained > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Zap size={14} color={colors.tint.amber} /><Text variant="label-m" style={{ color: colors.tint.amber }}>{t('games.match.xp', { n: match.xpGained })}</Text></View> : null}
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            {match.ratingDelta != null ? <Text variant="label-m" align="center" style={{ color: colors.tint.amber }}>{t('games.clash.delta', { d: match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta })}</Text> : null}
            <WordsToLearn words={match.me?.learnWords} />
            <Button title={t('games.clash.again')} loading={again.isPending} onPress={() => again.mutate()} />
            <Button title={t('games.match.rematch')} variant="secondary" onPress={() => router.replace(`/games/${slug}/online`)} />
            <Button title={t('games.result.hub')} variant="tertiary" onPress={() => router.replace('/games')} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {REACTIONS.map((r) => (
              <Pressable key={r} disabled={react.isPending} onPress={() => react.mutate(r)} accessibilityRole="button" accessibilityLabel={t(`games.match.react.${r}`)}
                style={{ minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }} allowFontScaling={false}>{t(`games.match.react.${r}`).split(' ')[0]}</Text>
              </Pressable>
            ))}
          </View>
          <Button size="sm" variant="tertiary" leftIcon={Flag} loading={resign.isPending} title={confirm ? t('games.match.resignConfirm') : t('games.match.resign')}
            onPress={() => { if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 4000); } else resign.mutate(); }} />
        </View>
      )}
    </Card>
  );
}
