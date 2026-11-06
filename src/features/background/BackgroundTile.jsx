import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { bgSurfaceSvg } from '@shared/vendor/domain/index.js';
import { Text } from '@components/Text';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

/** Arka plan önizleme karosu: kanvas + desen + üstünde küçük bir kart taslağı (içerik desenin üstünde nasıl durur). */
export const BackgroundTile = memo(function BackgroundTile({
  id,
  spec,
  label,
  premium,
  selected,
  onPress,
  width = 100,
  height = 76,
  role = 'radio',
}) {
  const { colors, radius, scheme } = useTheme();
  const { t } = useT();
  // Küçük karoda desenin birkaç tekrarı görünsün diye biraz küçültülür.
  const xml = useMemo(
    () =>
      spec
        ? bgSurfaceSvg({ ...spec, scale: Math.max(0.6, spec.scale * 0.75) }, scheme, {
            width,
            height,
            id: `t${id}`,
          })
        : null,
    [spec, scheme, width, height, id],
  );
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
      accessibilityLabel={premium ? `${label}, ${t('bg.premium')}` : label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ width, gap: 6, opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          width,
          height,
          borderRadius: radius.lg,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.accent.default : colors.border.default,
          backgroundColor: colors.bg.canvas,
          overflow: 'hidden',
        }}
      >
        {xml ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
            <SvgXml xml={xml} width={width} height={height} />
          </View>
        ) : null}
        <View
          style={{
            position: 'absolute',
            left: 10,
            top: 12,
            width: '58%',
            padding: 7,
            gap: 5,
            borderRadius: radius.sm,
            backgroundColor: colors.bg.surface,
          }}
        >
          <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border.default }} />
          <View
            style={{
              height: 4,
              width: '60%',
              borderRadius: 2,
              backgroundColor: colors.border.default,
            }}
          />
        </View>
        {premium ? (
          <View
            style={{
              position: 'absolute',
              left: 6,
              bottom: 6,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: radius.full,
              backgroundColor: colors.reward['subtle-bg'],
            }}
          >
            <Text variant="label-s" style={{ color: colors.text.primary, fontSize: 10 }}>
              {t('bg.premium')}
            </Text>
          </View>
        ) : null}
        {selected ? (
          <View
            style={{
              position: 'absolute',
              right: 6,
              top: 6,
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent.default,
            }}
          >
            <Check size={13} strokeWidth={3} color={colors.text['on-accent']} />
          </View>
        ) : null}
      </View>
      {label ? (
        <Text variant="label-m" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
});
