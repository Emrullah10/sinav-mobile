import { Pressable, View } from 'react-native';
import { useHaptics } from '@hooks/useHaptics';
import { useTheme } from '@theme';
import { Text } from './Text';

/** Segment kontrol (2–4 seçenek, 36). options: [{ value, label }]. Uzun etiketler iki satıra iner. */
export function Segmented({ options, value, onChange, accessibilityLabel, style }) {
  const { colors, radius } = useTheme();
  const haptics = useHaptics();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          padding: 2,
          borderRadius: radius.md,
          backgroundColor: colors.border.subtle,
          borderWidth: 1,
          borderColor: colors.border.default,
        },
        style,
      ]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (!selected) haptics.select();
              onChange?.(o.value);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              paddingHorizontal: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md - 2,
              backgroundColor: selected ? colors.bg.surface : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border.strong,
            }}
          >
            <Text
              variant="label-m"
              style={{
                color: selected ? colors.accent.default : colors.text.secondary,
                textAlign: 'center',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
