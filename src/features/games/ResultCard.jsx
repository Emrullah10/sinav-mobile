import { Flame, RotateCcw, Share2, Trophy } from 'lucide-react-native';
import { Share, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Button, Card, Text } from '@components';
import { formatPercent } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { WordsToLearn } from './WordsToLearn';

const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };
const BUCKETS = ['1', '2', '3', '4', '5', '6', 'x'];

const shareText = (play, label) => {
  const tries = play.status === 'won' ? play.guesses.length : 'X';
  const head = `ODAK · ${label}${play.puzzleDate ? ` ${play.puzzleDate}` : ''} ${tries}/${play.maxTries}`;
  return `${head}\n${play.guesses.map((g) => g.marks.map((m) => EMOJI[m]).join('')).join('\n')}`;
};

/** Oyun sonu kartı: sonuç, gizli kelime + anlam, puan, istatistik/dağılım, sonraki adımlar. */
export function ResultCard({ play, stats, onAgain, againBlocked, onHub }) {
  const { t, language } = useT();
  const { colors, radius } = useTheme();
  const won = play.status === 'won';
  const winRate = stats?.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const dist = stats?.distribution || {};
  const max = Math.max(1, ...BUCKETS.map((b) => dist[b] || 0));
  const share = async () => {
    const text = shareText(play, t('enums.game_key.letter_guess'));
    try {
      await Share.share({ message: text }); // sistem paylaşım sayfası ("Kopyala" dahil)
    } catch { /* kullanıcı vazgeçti */ }
  };
  return (
    <Animated.View entering={FadeInUp.duration(280)} style={{ width: '100%', maxWidth: 520 }}>
      <Card elevation={won ? 'e1' : 'e0'} style={{ gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 6 }} accessibilityRole="summary">
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: won ? colors.success.bg : colors.border.default }}>
            <Trophy size={22} color={won ? colors.success.fg : colors.text.secondary} />
          </View>
          <Text variant="heading-2">{won ? t('games.result.won') : t('games.result.lost')}</Text>
          {won ? <Text variant="body-m" color="secondary">{t('games.result.wonIn', { n: play.guesses.length })} · {t('games.result.score', { n: play.score })}</Text> : null}
        </View>
        {play.target ? (
          <View style={{ alignItems: 'center', gap: 2, padding: 14, borderRadius: radius.lg, backgroundColor: colors.bg.canvas }}>
            <Text variant="caption" color="secondary">{t('games.result.theWord')}</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' }}>{play.target}</Text>
            {play.meaning ? <Text variant="body-m" color="secondary">{play.meaning}</Text> : null}
          </View>
        ) : null}
        {stats ? (
          <>
            <View style={{ flexDirection: 'row' }}>
              {[
                [t('games.stats.played'), String(stats.played)],
                [t('games.stats.winRate'), formatPercent(winRate, language)],
                [t('games.stats.streak'), String(stats.currentStreak), true],
                [t('games.stats.best'), String(stats.bestStreak)],
              ].map(([label, value, flame]) => (
                <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="caption" color="secondary">{label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {flame ? <Flame size={15} color={colors.tint.amber} /> : null}
                    <Text variant="title">{value}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ gap: 4 }} accessibilityLabel={t('games.stats.distribution')}>
              {BUCKETS.map((b) => {
                const mine = won && b === String(play.guesses.length);
                return (
                  <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="caption" style={{ width: 14 }}>{b === 'x' ? '✕' : b}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ width: `${Math.max(8, ((dist[b] || 0) / max) * 100)}%`, minWidth: 24, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: mine ? colors.success.fg : colors.border.default, alignItems: 'flex-end' }}>
                        <Text variant="caption" style={{ color: mine ? colors.bg.surface : colors.text.secondary, fontWeight: '700' }}>{dist[b] || 0}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
        <WordsToLearn words={play.learnWords} />
        {againBlocked ? <Text variant="body-s" color="secondary">{t('games.result.noMore')}</Text> : null}
        <View style={{ gap: 8 }}>
          {play.kind === 'free' ? <Button title={t('games.result.again')} leftIcon={RotateCcw} onPress={onAgain} disabled={againBlocked} /> : null}
          <Button title={t('games.result.share')} variant="secondary" leftIcon={Share2} onPress={share} />
          <Button title={t('games.result.hub')} variant="tertiary" onPress={onHub} />
        </View>
      </Card>
    </Animated.View>
  );
}
