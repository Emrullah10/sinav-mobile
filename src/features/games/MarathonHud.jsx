import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Flag, Heart, ListOrdered, RotateCcw, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { byKey } from './games';
import { goalText } from './LevelStrip';
import { WordsToLearn } from './WordsToLearn';

/** Maraton: tur rozeti, canlar, skor, tur hedefi, tur arası bildirim ve koşu sonu kartı. */
export function MarathonHud({ play, setPlay }) {
  const { t } = useT();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const m = play?.marathon;
  const [seen, setSeen] = useState(0);
  const toast = m?.last && !m.over && m.last.n !== seen ? m.last : null;
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setSeen(toast.n), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  const quit = useMutation({
    mutationFn: async () => unwrap(await api.gamesPlayMove(play.code, { quit: true })),
    onSuccess: (d) => { setPlay(d.play); qc.invalidateQueries({ queryKey: queryKeys.games.hub() }); },
  });
  const hub = useQuery({ queryKey: [...queryKeys.games.hub(), 'marathon-end', play?.code], queryFn: async () => unwrap(await api.gamesHubGet()), enabled: Boolean(m?.over), staleTime: 0 });
  if (!m) return null;
  const slug = byKey(play.game)?.slug;
  const stats = hub.data?.games?.find((g) => g.key === play.game)?.marathon;

  if (m.over) {
    const record = stats && m.score > 0 && m.score >= stats.best;
    return (
      <Card elevation="e1" style={{ gap: 12, alignItems: 'center', width: '100%', maxWidth: 520 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint['amber-bg'] }}>
          <Trophy size={22} color={colors.tint.amber} />
        </View>
        <Text variant="heading-2" align="center">{t('games.marathon.over')}</Text>
        <Text style={{ fontSize: 34, fontWeight: '800' }}>{t('games.marathon.total', { n: m.score })}</Text>
        <Text variant="body-m" color="secondary">{t('games.marathon.rounds', { n: m.passed })}</Text>
        {record ? <Text variant="label-m" style={{ color: colors.tint.amber }}>{t('games.marathon.record')}</Text> : null}
        {stats?.weekRank ? <Text variant="body-m">{t('games.marathon.weekRank', { n: stats.weekRank })}</Text> : null}
        <WordsToLearn words={play.learnWords} />
        <View style={{ gap: 8, alignSelf: 'stretch' }}>
          <Button title={t('games.marathon.again')} leftIcon={RotateCcw} onPress={() => router.replace(`/games/${slug}?kind=marathon&t=${Date.now()}`)} />
          <Button title={t('games.marathon.board')} variant="secondary" leftIcon={ListOrdered} onPress={() => router.push(`/games/${slug}/leaderboard`)} />
          <Button title={t('games.result.hub')} variant="tertiary" onPress={() => router.replace('/games')} />
        </View>
      </Card>
    );
  }
  return (
    <View style={{ gap: 8, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Text variant="label-l">{t('games.marathon.round', { n: m.round })}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={t('games.marathon.lives', { n: m.lives })}>
          {Array.from({ length: m.maxLives }, (_, i) => <Heart key={i} size={18} color={i < m.lives ? colors.danger.fg : colors.text.tertiary} fill={i < m.lives ? colors.danger.fg : 'transparent'} />)}
        </View>
        <Text variant="label-l" style={{ color: colors.tint.amber }}>{t('games.marathon.score', { n: m.score })}</Text>
        <Button size="sm" variant="tertiary" leftIcon={Flag} loading={quit.isPending} title={t('games.marathon.quit')} onPress={() => quit.mutate()} />
      </View>
      <Text variant="body-s" color="secondary" align="center">{goalText(t, m.goal)}</Text>
      {toast ? (
        <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: toast.passed ? colors.success.bg : colors.warning.bg }}>
          <Text variant="label-m" align="center" style={{ color: toast.passed ? colors.success.fg : colors.warning.fg }}>
            {toast.passed ? t('games.marathon.passed', { n: toast.n, p: toast.points }) : t('games.marathon.failed', { n: toast.n })}{toast.answer ? ` · ${t('games.marathon.answer', { w: toast.answer })}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
