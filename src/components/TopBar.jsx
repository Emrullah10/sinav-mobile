import { ArrowLeft, X } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { IconButton } from './IconButton';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';

/**
 * Üst çubuk (≥56 + güvenli alan).
 *  variant="standard": title, onBack (ok ikonu), right (düğüm), subtitle.
 *  variant="large": büyük başlık (heading-1) altta, right üstte.
 *  variant="focus": odak modu — yalnız kapat (onClose), ilerleme (progress 0–1, counter "3 / 10") ve zaman (timer "12:30").
 */
export function TopBar({
  variant = 'standard',
  title,
  subtitle,
  onBack,
  onClose,
  right,
  progress,
  counter,
  timer,
  border = false,
}) {
  const { colors, space } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const wrap = {
    paddingTop: insets.top,
    backgroundColor: colors.bg.canvas,
    borderBottomWidth: border ? 1 : 0,
    borderBottomColor: colors.border.subtle,
  };

  if (variant === 'focus') {
    return (
      <View style={wrap}>
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            paddingHorizontal: space[3],
          }}
        >
          <IconButton icon={X} onPress={onClose} accessibilityLabel={t('focus.exit')} />
          <View style={{ flex: 1, gap: 4 }}>
            {counter ? (
              <Text variant="label-s" color="secondary" align="center">
                {counter}
              </Text>
            ) : null}
            {progress != null ? (
              <ProgressBar value={progress} height={4} accessibilityLabel={counter} />
            ) : null}
          </View>
          <View style={{ minWidth: 56, alignItems: 'flex-end', paddingRight: space[2] }}>
            {timer ? (
              <Text variant="numeric-m" accessibilityRole="timer">
                {timer}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }
  if (variant === 'large') {
    return (
      <View style={wrap}>
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: space[3],
          }}
        >
          {right}
        </View>
        <View style={{ paddingHorizontal: space[5], paddingBottom: space[4], gap: 2 }}>
          <Text variant="heading-1" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body-m" color="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={wrap}>
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
          paddingHorizontal: space[3],
        }}
      >
        {onBack ? (
          <IconButton icon={ArrowLeft} onPress={onBack} accessibilityLabel={t('common.back')} />
        ) : (
          <View style={{ width: space[3] }} />
        )}
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}
