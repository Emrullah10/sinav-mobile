import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Flame, Infinity as Inf, KeyRound, Layers, ListOrdered, Play, Swords, UserPlus, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banner, Button, Card, IconTile, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { GAMES } from './games';

const quotaText = (t, q) => {
  if (!q) return null;
  if (q.limit === null) return t('games.quotaUnlimited');
  return q.remaining > 0 ? t('games.quota', { n: q.remaining }) : t('games.quotaNone');
};

function Tiles({ word, hue }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[...word].map((ch, i) => (
        <View key={i} style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.tint[`${hue}-bg`], alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: colors.tint[hue], fontWeight: '800', fontSize: 18 }}>{ch}</Text>
        </View>
      ))}
    </View>
  );
}

/** Oyunlar ana ekranı: günün bulmacaları, kalan hak, seri. */
export function GamesHubScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const query = useQuery({ queryKey: queryKeys.games.hub(), queryFn: async () => unwrap(await api.gamesHubGet()), staleTime: 15_000 });
  const [clashGame, setClashGame] = useState(null);
  const [clashError, setClashError] = useState(null);
  const openMatch = (d) => router.push(`/games/match/${d.match.code}`);
  const clashFail = (e) => setClashError(apiErrorCode(e) === 'QUOTA_EXCEEDED' ? t('games.quotaNone') : errorText(t, e));
  const clashFind = useMutation({ mutationFn: async (key) => unwrap(await api.gamesMatchmake(key)), onSuccess: openMatch, onError: clashFail });
  const clashInvite = useMutation({ mutationFn: async (key) => unwrap(await api.gamesMatchCreate(key)), onSuccess: openMatch, onError: clashFail });
  const levels = (g) => router.push(`/games/${g.slug}/levels`);
  const online = (g) => router.push(`/games/${g.slug}/online`);
  const matches = useQuery({ queryKey: queryKeys.games.matches(), queryFn: async () => unwrap(await api.gamesMatchesList()), staleTime: 10_000, refetchInterval: 20_000 });
  const go = (g, kind) => router.push(`/games/${g.slug}?kind=${kind}`);
  return (
    <Screen
      header={<TopBar variant="standard" title={t('games.title')} onBack={() => router.back()} />}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => {
          const byKey = Object.fromEntries(d.games.map((g) => [g.key, g]));
          const clash = GAMES.find((g) => g.key === (clashGame || d.games.find((x) => x.league && x.league.wins + x.league.losses + x.league.draws > 0)?.key)) || GAMES[0];
          const league = byKey[clash.key]?.league;
          const out = d.quota.limit !== null && d.quota.remaining === 0;
          return (
            <View style={{ gap: 14 }}>
              <View style={{ gap: 4 }}>
                <Text variant="body-m" color="secondary">{t('games.subtitle')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Zap size={14} color={colors.tint.amber} />
                  <Text variant="label-m">{t('games.player.level', { n: d.profile.level })} · {t('games.player.xp', { xp: d.profile.xp, next: d.profile.next })}</Text>
                </View>
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: out ? colors.warning.border : colors.border.default, backgroundColor: out ? colors.warning.bg : colors.bg.surface }}>
                  <Text variant="label-m" style={{ color: out ? colors.warning.fg : colors.text.primary }}>{quotaText(t, d.quota)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={t('games.daily.strip')}>
                {GAMES.map((g) => {
                  const dd = byKey[g.key]?.daily;
                  const done = dd && dd.status !== 'active';
                  return (
                    <Pressable key={g.key} onPress={() => go(g, 'daily')} accessibilityRole="button" accessibilityLabel={`${t(`enums.game_key.${g.key}`)}: ${done ? t('games.daily.done') : dd ? t('games.daily.going') : t('games.daily.todo')}`}
                      style={{ flex: 1, minHeight: 64, borderRadius: 14, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: done ? 0.65 : 1 }}>
                      <IconTile icon={g.icon} hue={g.hue} size={28} />
                      <Text variant="caption" color="secondary">{done ? t('games.daily.done') : dd ? t('games.daily.going') : t('games.daily.todo')}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <IconTile icon={Swords} hue="plum" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">{t('games.clash.title')}</Text>
                    <Text variant="body-s" color="secondary">{t('games.clash.sub')}</Text>
                    {league ? <Text variant="label-m" style={{ color: colors.tint.plum }}>{t('games.clash.rating', { n: league.rating })}{league.rank ? ` · ${t('games.clash.rank', { n: league.rank })}` : ''}</Text> : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {GAMES.map((g) => (
                    <Pressable key={g.key} onPress={() => setClashGame(g.key)} accessibilityRole="radio" accessibilityState={{ selected: clash.key === g.key }}
                      style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: clash.key === g.key ? colors.tint.plum : colors.border.default, backgroundColor: clash.key === g.key ? colors.tint['plum-bg'] : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="label-m" style={{ color: clash.key === g.key ? colors.tint.plum : colors.text.primary }}>{t(`enums.game_key.${g.key}`)}</Text>
                    </Pressable>
                  ))}
                </View>
                {clashError ? <Banner tone="warning" message={clashError} /> : null}
                <View style={{ gap: 8 }}>
                  <Button size="md" fullWidth leftIcon={Swords} title={t('games.clash.find')} loading={clashFind.isPending} onPress={() => { setClashError(null); clashFind.mutate(clash.key); }} />
                  <Button size="md" fullWidth variant="secondary" leftIcon={UserPlus} title={t('games.clash.invite')} loading={clashInvite.isPending} onPress={() => { setClashError(null); clashInvite.mutate(clash.key); }} />
                  <Button size="md" fullWidth variant="tertiary" leftIcon={KeyRound} title={t('games.clash.join')} onPress={() => online(clash)} />
                  <Button size="md" fullWidth variant="tertiary" leftIcon={ListOrdered} title={t('games.marathon.board')} onPress={() => router.push(`/games/${clash.slug}/leaderboard`)} />
                </View>
              {(matches.data?.matches || []).length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text variant="label-l">{t('games.match.activeList')}</Text>
                  {matches.data.matches.map((m) => (
                    <Button key={m.code} variant="secondary" size="md" fullWidth
                      title={`${t(`enums.game_key.${m.game}`)} · ${m.opponent ? t('games.match.vs', { name: m.opponent.name }) : t('games.match.waitingBadge')} · ${m.myTurn ? t('games.match.myTurnBadge') : m.status === 'finished' ? t('games.match.finishedBadge') : m.status === 'waiting' ? t('games.match.waitingBadge') : t('games.match.theirTurn')}`}
                      onPress={() => router.push(`/games/match/${m.code}`)} />
                  ))}
                </View>
              ) : null}
              </Card>
              {GAMES.map((g) => {
                const s = byKey[g.key];
                const daily = s?.daily;
                const doneToday = daily && daily.status !== 'active';
                const streak = s?.stats?.currentStreak || 0;
                return (
                  <Card key={g.key} style={{ gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <IconTile icon={g.icon} hue={g.hue} size={40} muted={!g.ready} />
                      <View style={{ flex: 1 }}>
                        <Text variant="title">{t(`enums.game_key.${g.key}`)}</Text>
                        <Text variant="body-s" color="secondary">{t(g.descKey)}</Text>
                      </View>
                      {streak > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.tint['amber-bg'] }}>
                          <Flame size={13} color={colors.tint.amber} />
                          <Text variant="label-s" style={{ color: colors.tint.amber }}>{t('games.streak', { n: streak })}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Tiles word={g.word} hue={g.hue} />
                    {g.ready && s ? (
                      <View style={{ gap: 8 }}>
                        <Button
                          size="md"
                          fullWidth
                          variant={doneToday ? 'secondary' : 'primary'}
                          leftIcon={doneToday ? Check : Play}
                          title={daily?.status === 'active' ? t('games.dailyResume') : daily ? t('games.dailyDone') : t('games.daily')}
                          onPress={() => go(g, 'daily')}
                        />
                        <Button size="md" fullWidth variant="secondary" leftIcon={Layers} title={t('games.level.hubLine', { n: s.levels.unlocked, stars: s.levels.totalStars })} onPress={() => levels(g)} />
                        <Button size="md" fullWidth variant="secondary" leftIcon={Inf} title={s.marathon?.best ? t('games.marathon.hubLine', { n: s.marathon.best }) : t('games.marathon.start')} onPress={() => go(g, 'marathon')} />
                        <Button size="md" fullWidth leftIcon={Swords} title={t('games.match.online')} onPress={() => online(g)} />
                      </View>
                    ) : (
                      <Text variant="label-m" color="secondary">{t('games.soon')}</Text>
                    )}
                  </Card>
                );
              })}
            </View>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
