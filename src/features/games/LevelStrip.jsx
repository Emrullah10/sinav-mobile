import { router } from 'expo-router';
import { ArrowRight, Map, RotateCcw, Star, Zap } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { byKey } from './games';

export const goalText = (t, goal) => {
  const [a, b, c] = goal.thresholds;
  if (goal.metric === 'score') return t('games.level.goalScore', { one: a, two: b, three: c });
  return a ? t('games.level.goalTriesN', { one: a, two: b, three: c }) : t('games.level.goalTries', { two: b, three: c });
};

/** Seviye oyunu: oyun sırasında hedef şeridi. */
export function LevelGoal({ play }) {
  const { t } = useT();
  if (play?.kind !== 'level' || !play.level) return null;
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text variant="title">{t('games.level.label', { n: play.level.n })}</Text>
      <Text variant="body-s" color="secondary" align="center">{goalText(t, play.level.goal)}</Text>
    </View>
  );
}

/** Seviye bitince: yıldızlar, XP, sonraki seviye / yeniden dene / harita. */
export function LevelReward({ play }) {
  const { t } = useT();
  const { colors } = useTheme();
  if (play?.kind !== 'level' || !play.level || play.status === 'active' || play.level.stars === undefined) return null;
  const { n, stars, newStars, xpGained, nextUnlocked } = play.level;
  const slug = byKey(play.game)?.slug;
  const go = (level) => router.replace(`/games/${slug}?kind=level&level=${level}&t=${Date.now()}`);
  return (
    <Card style={{ gap: 10, alignItems: 'center', width: '100%', maxWidth: 440 }}>
      <Text variant="heading-3" align="center">{stars > 0 ? t('games.level.cleared') : t('games.level.failed')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={t('games.level.stars', { n: stars, total: 3 })}>
        {[1, 2, 3].map((i) => <Star key={i} size={34} color={i <= stars ? colors.tint.amber : colors.text.tertiary} fill={i <= stars ? colors.tint.amber : 'transparent'} />)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Text variant="body-m" color="secondary">{t('games.level.label', { n })}{newStars > 0 ? ` · ${t('games.level.newStars', { n: newStars })}` : ''}</Text>
        {xpGained > 0 ? <><Zap size={14} color={colors.tint.amber} /><Text variant="label-m" style={{ color: colors.tint.amber }}>{t('games.level.xp', { n: xpGained })}</Text></> : null}
      </View>
      {n === 60 && stars > 0 ? <Text variant="body-m" align="center">{t('games.level.allDone')}</Text> : null}
      <View style={{ gap: 8, alignSelf: 'stretch' }}>
        {nextUnlocked ? <Button title={t('games.level.next')} rightIcon={ArrowRight} onPress={() => go(nextUnlocked)} /> : null}
        <Button title={t('games.level.retry')} variant={nextUnlocked ? 'secondary' : 'primary'} leftIcon={RotateCcw} onPress={() => go(n)} />
        <Button title={t('games.level.map')} variant="tertiary" leftIcon={Map} onPress={() => router.replace(`/games/${slug}/levels`)} />
      </View>
    </Card>
  );
}
