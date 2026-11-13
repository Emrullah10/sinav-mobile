import { RotateCcw, Share2, Trophy } from 'lucide-react-native';
import { Share, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Button, Card, Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { WordsToLearn } from './WordsToLearn';

function Chips({ words, ghost }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
      {words.map((w) => (
        <View key={w.word || w} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: ghost ? colors.border.default : colors.success.bg }}>
          <Text variant="label-m" style={{ color: ghost ? colors.text.secondary : colors.success.fg }}>{w.word || w}</Text>
          {w.points ? <Text variant="caption" style={{ color: colors.success.fg, opacity: 0.75 }}>{w.points}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Kelime Avı sonucu. */
export function HuntResult({ play, stats, onAgain, againBlocked, onHub }) {
  const { t } = useT();
  const { colors } = useTheme();
  const n = play.found.length;
  const share = async () => {
    try {
      await Share.share({ message: t('games.hunt.share', { date: play.puzzleDate || '', words: n, points: play.score }) });
    } catch { /* vazgeçildi */ }
  };
  return (
    <Animated.View entering={FadeInUp.duration(280)} style={{ width: '100%', maxWidth: 520 }}>
      <Card elevation={n ? 'e1' : 'e0'} style={{ gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: n ? colors.success.bg : colors.border.default }}>
            <Trophy size={22} color={n ? colors.success.fg : colors.text.secondary} />
          </View>
          <Text variant="heading-2">{t('games.hunt.timeUp')}</Text>
          <Text variant="body-m" color="secondary">{n ? `${t('games.hunt.result.wordCount', { n })} · ${t('games.result.score', { n: play.score })}` : t('games.hunt.result.none')}</Text>
        </View>
        {n ? <Chips words={[...play.found].sort((a, b) => b.points - a.points)} /> : null}
        {play.missed?.length ? (
          <View style={{ gap: 6, alignItems: 'center' }}>
            <Text variant="caption" color="secondary" align="center">{t('games.hunt.missed')} · {t('games.hunt.possible', { n: play.possibleCount })}</Text>
            <Chips words={play.missed} ghost />
          </View>
        ) : null}
        {stats ? (
          <View style={{ flexDirection: 'row' }}>
            {[[t('games.stats.played'), stats.played], [t('games.stats.best'), stats.bestScore]].map(([l, v]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="caption" color="secondary">{l}</Text>
                <Text variant="title">{v}</Text>
              </View>
            ))}
          </View>
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
