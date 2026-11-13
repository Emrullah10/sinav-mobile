import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Lock, Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { LEVEL_SECTIONS, sectionOf } from '@shared/vendor/domain/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { bySlug } from './games';

/** Seviye haritası: 6 bölüm × 10 düğüm. */
export function GameLevelsScreen({ slug }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const g = bySlug(slug);
  const query = useQuery({ queryKey: queryKeys.games.levels(g?.key ?? 'none'), queryFn: async () => unwrap(await api.gamesLevelsGet(g.key)), enabled: Boolean(g), staleTime: 5_000 });
  return (
    <Screen
      header={<TopBar variant="standard" title={`${g ? t(`enums.game_key.${g.key}`) : ''} · ${t('games.level.path')}`} onBack={() => router.back()} />}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            <Text variant="label-m" color="secondary">{t('games.level.stars', { n: d.totalStars, total: d.total * 3 })}</Text>
            {Array.from({ length: LEVEL_SECTIONS }, (_, s) => (
              <View key={s} style={{ gap: 8 }}>
                <Text variant="caption" color="secondary">{t('games.level.section', { n: s + 1 })}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {d.levels.filter((l) => sectionOf(l.level) === s).map((l) => {
                    const locked = l.level > d.unlocked;
                    const current = l.level === d.unlocked;
                    return (
                      <Pressable
                        key={l.level}
                        disabled={locked}
                        onPress={() => router.push(`/games/${g.slug}?kind=level&level=${l.level}`)}
                        accessibilityRole="button"
                        accessibilityLabel={locked ? `${t('games.level.label', { n: l.level })}. ${t('games.level.locked')}` : `${t('games.level.label', { n: l.level })}. ${t('games.level.stars', { n: l.stars, total: 3 })}`}
                        style={{ width: '18%', minHeight: 56, borderRadius: radius.md, borderWidth: current ? 2 : 1, borderColor: current ? colors.tint.amber : colors.border.default, backgroundColor: colors.bg.surface, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: locked ? 0.5 : 1 }}
                      >
                        {locked ? <Lock size={16} color={colors.text.secondary} /> : <Text variant="title">{l.level}</Text>}
                        <View style={{ flexDirection: 'row' }}>
                          {[1, 2, 3].map((i) => <Star key={i} size={11} color={i <= l.stars ? colors.tint.amber : colors.text.tertiary} fill={i <= l.stars ? colors.tint.amber : 'transparent'} />)}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
