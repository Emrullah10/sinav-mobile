import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Card, QueryBoundary, Screen, Segmented, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { bySlug } from './games';

function Row({ r, unit, t, strong }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: r.me ? colors.tint['indigo-bg'] : 'transparent' }}>
      <Text variant="label-l" color="secondary" style={{ minWidth: 28, textAlign: 'center' }}>{r.rank}</Text>
      <View style={{ flex: 1 }}>
        <Text variant={strong ? 'title' : 'label-l'} numberOfLines={1}>{r.me && !r.name ? t('games.board.you') : r.name}</Text>
        <Text variant="caption" color="secondary">{t('games.board.level', { n: r.level })}</Text>
      </View>
      <Text variant="label-l">{r.score} <Text variant="caption" color="secondary">{unit}</Text></Text>
    </View>
  );
}

/** Sıralama: Maraton | Çevrimiçi × Bu hafta | Tüm zamanlar; ilk 3 kürsü, liste, benim satırım altta. */
export function GameLeaderboardScreen({ slug }) {
  const { t } = useT();
  const { colors } = useTheme();
  const g = bySlug(slug);
  const [mode, setMode] = useState('marathon');
  const [period, setPeriod] = useState('week');
  const query = useQuery({ queryKey: queryKeys.games.leaderboard(g?.key ?? 'none', mode, period), queryFn: async () => unwrap(await api.gamesLeaderboardGet(g.key, { mode, period })), enabled: Boolean(g), staleTime: 15_000 });
  const unit = mode === 'marathon' ? t('games.board.unitMarathon') : period === 'all' ? t('games.board.unitOnlineAll') : t('games.board.unitOnlineWeek');
  return (
    <Screen
      header={<TopBar variant="standard" title={`${g ? t(`enums.game_key.${g.key}`) : ''} · ${t('games.board.title')}`} onBack={() => router.back()} />}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <View style={{ gap: 12 }}>
        <Segmented accessibilityLabel={t('games.board.title')} value={mode} onChange={setMode} options={[{ value: 'marathon', label: t('games.board.modeMarathon') }, { value: 'online', label: t('games.board.modeOnline') }]} />
        <Segmented accessibilityLabel={t('games.board.periodWeek')} value={period} onChange={setPeriod} options={[{ value: 'week', label: t('games.board.periodWeek') }, { value: 'all', label: t('games.board.periodAll') }]} />
        <QueryBoundary query={query}>
          {(d) => {
            if (!d.top.length) return <Card><Text variant="body-m" color="secondary">{t('games.board.empty')}</Text></Card>;
            const podium = d.top.slice(0, 3);
            const rest = d.top.slice(3);
            const meIn = d.top.some((r) => r.me);
            return (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                  {[1, 0, 2].filter((i) => podium[i]).map((i) => (
                    <Card key={i} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: i === 0 ? 20 : 12, borderWidth: i === 0 ? 1 : 0, borderColor: colors.tint.amber }}>
                      {i === 0 ? <Crown size={20} color={colors.tint.amber} /> : null}
                      <Text variant="heading-3" style={{ color: colors.tint.amber }}>{podium[i].rank}</Text>
                      <Text variant="label-l" numberOfLines={1}>{podium[i].name}</Text>
                      <Text variant="caption" color="secondary">{t('games.board.level', { n: podium[i].level })}</Text>
                      <Text variant="title">{podium[i].score}</Text>
                    </Card>
                  ))}
                </View>
                {rest.length ? <Card style={{ gap: 4 }}>{rest.map((r) => <Row key={`${r.rank}-${r.name}`} r={r} unit={unit} t={t} />)}</Card> : null}
                {d.me && !meIn ? <Card><Row r={{ ...d.me, me: true }} unit={unit} t={t} strong /></Card> : null}
              </View>
            );
          }}
        </QueryBoundary>
      </View>
    </Screen>
  );
}
