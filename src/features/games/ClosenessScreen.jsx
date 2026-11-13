import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Flag, Lightbulb, RotateCcw, Send, Share2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Share, TextInput, View } from 'react-native';
import { Banner, BubbleLoader, Button, Card, Screen, Text, TopBar } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { closenessFill, closenessTone } from '@shared/vendor/domain/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useGamePlay } from './useGamePlay';
import { sendMove } from './moves';
import { LevelGoal, LevelReward } from './LevelStrip';
import { MarathonHud } from './MarathonHud';
import { MatchBar } from './MatchBar';
import { WordsToLearn } from './WordsToLearn';

const BUCKETS = ['b5', 'b10', 'b20', 'b40', 'b41', 'lost'];

function Row({ g, size, latest }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const tone = closenessTone(g.rank);
  const col = { found: colors.success.fg, hot: colors.success.fg, warm: colors.tint.amber, mild: colors.tint.indigo, cold: colors.text.tertiary }[tone];
  const bar = { found: colors.success.fg, hot: colors.success.fg, warm: colors.tint.amber, mild: colors.tint.indigo, cold: colors.border.strong }[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${g.word}, ${t('games.close.rank', { n: g.rank })}, ${t(`games.close.tone.${tone}`)}`}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md,
        backgroundColor: colors.bg.surface, borderWidth: latest ? 2 : 1, borderColor: latest ? colors.accent.default : colors.border.default,
      }}
    >
      <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text variant="label-l" numberOfLines={1} style={{ flexShrink: 1 }}>{g.word}</Text>
        {g.hint ? (
          <View style={{ paddingHorizontal: 6, borderRadius: 999, backgroundColor: colors.tint['amber-bg'] }}>
            <Text variant="caption" style={{ color: colors.tint.amber }}>{t('games.close.hintTag')}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 2, height: 10, borderRadius: 5, backgroundColor: colors.border.default, overflow: 'hidden' }}>
        <View style={{ width: `${closenessFill(g.rank, size) * 100}%`, height: '100%', borderRadius: 5, backgroundColor: bar }} />
      </View>
      <Text variant="label-l" style={{ minWidth: 56, textAlign: 'right', color: col }}>{g.rank === 1 ? '★' : `#${g.rank}`}</Text>
    </View>
  );
}

/** Anlam Yakınlığı: sunucu vektörlerle sırayı hesaplar; gizli kelime bitene kadar gelmez. */
export function ClosenessScreen({ kind, level, matchCode }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const { play, setPlay, error, blocked, again, match } = useGamePlay('closeness', kind, level, matchCode);
  const hub = useQuery({ queryKey: queryKeys.games.hub(), queryFn: async () => unwrap(await api.gamesHubGet()), staleTime: 30_000 });
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);
  const [confirm, setConfirm] = useState(false);

  const move = useMutation({
    mutationFn: async ({ code, body }) => unwrap(await sendMove(play, code, body)),
    onSuccess: (d) => {
      setPlay(d.play);
      if (d.stats) setStats(d.stats);
      setMessage('');
      if (d.play.status === 'won') haptics.success(); else haptics.tap();
      if (d.play.status !== 'active') qc.invalidateQueries({ queryKey: queryKeys.games.hub() });
    },
    onError: (e) => { setMessage(errorText(t, e)); haptics.warning(); },
  });

  const hubStats = hub.data?.games?.find((g) => g.key === 'closeness')?.stats || null;
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
  const won = play.status === 'won';
  const latestOrder = Math.max(-1, ...play.guesses.map((g) => g.order));
  const latest = play.guesses.find((g) => g.order === latestOrder);
  const send = () => {
    const w = text.trim().toLowerCase();
    if (!w || move.isPending) return;
    setText('');
    move.mutate({ code: play.code, body: { guess: w } });
  };
  const giveUp = () => {
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 4000); return; }
    move.mutate({ code: play.code, body: { giveUp: true } });
  };
  const share = async () => {
    try { await Share.share({ message: t('games.close.share', { date: play.puzzleDate || '', n: play.tries }) }); } catch { /* vazgeçildi */ }
  };
  const dist = (stats || hubStats)?.distribution || {};
  const max = Math.max(1, ...BUCKETS.map((b) => dist[b] || 0));

  return (
    <Screen header={header} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
      {match ? <MatchBar match={match} /> : null}
      <LevelGoal play={play} />
      <MarathonHud play={play} setPlay={setPlay} />
      {play.status !== 'active' ? <LevelReward play={play} /> : null}
      {!finished ? (
        <>
          <Text variant="body-s" color="secondary" align="center">{t('games.close.how')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.replace(/[^a-zA-Z]/g, ''))}
              onSubmitEditing={send}
              placeholder={t('games.close.placeholder')}
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel={t('games.close.placeholder')}
              autoCapitalize="none" autoCorrect={false} spellCheck={false} maxLength={12} returnKeyType="send" blurOnSubmit={false}
              style={{ flex: 1, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border.strong, backgroundColor: colors.bg.surface, color: colors.text.primary, fontSize: 18, fontWeight: '600' }}
            />
            <Button title={t('games.close.guess')} size="lg" fullWidth={false} leftIcon={Send} loading={move.isPending} onPress={send} />
          </View>
          <View style={{ minHeight: 44 }} accessibilityLiveRegion="polite">{message ? <Banner tone="warning" message={message} /> : null}</View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="body-s" color="secondary" style={{ flex: 1 }}>{t('games.close.tries', { n: play.tries })}</Text>
            <Button title={t('games.close.hint', { n: play.hintsLeft })} size="sm" variant="secondary" leftIcon={Lightbulb} disabled={play.hintsLeft <= 0 || move.isPending} onPress={() => move.mutate({ code: play.code, body: { hint: true } })} />
            <Button title={confirm ? `${t('games.close.giveUp')}?` : t('games.close.giveUp')} size="sm" variant="tertiary" leftIcon={Flag} onPress={giveUp} />
          </View>
          {latest ? (
            <View style={{ gap: 6 }}>
              <Text variant="caption" color="secondary">{t('games.close.last')}</Text>
              <Row g={latest} size={play.vocabSize} latest />
            </View>
          ) : null}
        </>
      ) : play.kind === 'marathon' ? null : (
        <Card elevation={won ? 'e1' : 'e0'} style={{ gap: 12, alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: won ? colors.success.bg : colors.border.default }}>
            <Trophy size={22} color={won ? colors.success.fg : colors.text.secondary} />
          </View>
          <Text variant="heading-2" align="center">{won ? t('games.close.result.won') : t('games.close.result.lost')}</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' }}>{play.target}</Text>
          {play.meaning ? <Text variant="body-m" color="secondary">{play.meaning}</Text> : null}
          {won ? <Text variant="body-m" color="secondary">{t('games.close.result.guesses', { n: play.tries })} · {t('games.result.score', { n: play.score })}</Text> : null}
          {play.nearest?.length ? (
            <View style={{ gap: 6, alignItems: 'center' }}>
              <Text variant="caption" color="secondary">{t('games.close.nearest')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {play.nearest.map((w) => (
                  <View key={w} style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.border.default }}>
                    <Text variant="label-m" color="secondary">{w}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {(stats || hubStats) ? (
            <View style={{ gap: 4, alignSelf: 'stretch' }}>
              {BUCKETS.map((b) => (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="caption" style={{ width: 92 }}>{t(`games.close.bucket.${b}`)}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ width: `${Math.max(8, ((dist[b] || 0) / max) * 100)}%`, minWidth: 24, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.border.default, alignItems: 'flex-end' }}>
                      <Text variant="caption" color="secondary" style={{ fontWeight: '700' }}>{dist[b] || 0}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <WordsToLearn words={play.learnWords} />
          {blocked ? <Text variant="body-s" color="secondary">{t('games.result.noMore')}</Text> : null}
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            {play.kind === 'free' ? <Button title={t('games.result.again')} leftIcon={RotateCcw} onPress={again} disabled={blocked || (quota && quota.limit !== null && quota.remaining === 0)} /> : null}
            <Button title={t('games.result.share')} variant="secondary" leftIcon={Share2} onPress={share} />
            <Button title={t('games.result.hub')} variant="tertiary" onPress={back} />
          </View>
        </Card>
      )}
      {play.guesses.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text variant="caption" color="secondary">{t('games.close.best')} · {t('games.close.of', { n: play.vocabSize.toLocaleString() })}</Text>
          {play.guesses.map((g) => <Row key={g.word} g={g} size={play.vocabSize} latest={!finished && g.order === latestOrder} />)}
        </View>
      ) : null}
    </Screen>
  );
}
