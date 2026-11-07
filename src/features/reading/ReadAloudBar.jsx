import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import { IconButton, Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { READ_RATES } from './useReadAloud';

/** Okuyucunun altındaki sesli okuma çubuğu: önceki/sonraki cümle, oynat/duraklat, hız, kapat. */
export function ReadAloudBar({ aloud }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const playing = aloud.status === 'playing';
  const at = READ_RATES[aloud.rate] ? aloud.rate : 1;
  const rate = READ_RATES[at];
  const next = (at + 1) % READ_RATES.length;
  return (
    <View style={{ gap: 10 }}>
      {aloud.showVoiceTip ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="caption" color="secondary" style={{ flex: 1 }}>
            {t(Platform.OS === 'ios' ? 'read.aloud.voiceTipIos' : 'read.aloud.voiceTipAndroid')}
          </Text>
          <IconButton
            icon={X}
            size={32}
            accessibilityLabel={t('read.aloud.voiceTipClose')}
            onPress={aloud.closeTip}
          />
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('read.aloud.speed', { n: rate.label })}
          onPress={() => aloud.setRate(next)}
          style={({ pressed }) => ({
            minWidth: 52,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: pressed ? colors.bg.pressed : 'transparent',
          })}
        >
          <Text variant="label-m">{`${rate.label}×`}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton
            icon={SkipBack}
            accessibilityLabel={t('read.aloud.prev')}
            onPress={() => aloud.skip(-1)}
          />
          <IconButton
            icon={playing ? Pause : Play}
            variant="tonal"
            size={44}
            accessibilityLabel={playing ? t('read.aloud.pause') : t('read.aloud.play')}
            onPress={aloud.toggle}
          />
          <IconButton
            icon={SkipForward}
            accessibilityLabel={t('read.aloud.next')}
            onPress={() => aloud.skip(1)}
          />
        </View>
        <IconButton icon={X} accessibilityLabel={t('read.aloud.close')} onPress={aloud.stop} />
      </View>
    </View>
  );
}
