import { Check, X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Text } from './Text';

/** Çip. size: 'md' (32) | 'sm' (28). selected → ✓ ikonu. onRemove verilirse silinebilir çip. Dokunma alanı hitSlop ile 44'e tamamlanır. */
export function Chip({
  label,
  selected = false,
  onPress,
  onRemove,
  icon: Icon,
  size = 'md',
  disabled = false,
  style,
}) {
  const { colors, radius } = useTheme();
  const { t } = useT();
  const haptics = useHaptics();
  const h = size === 'sm' ? 28 : 32;
  const fg = disabled
    ? colors.text.disabled
    : selected
      ? colors.accent['subtle-fg']
      : colors.text.secondary;
  const pad = (44 - h) / 2;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      hitSlop={{ top: pad, bottom: pad, left: 4, right: 4 }}
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight: h,
          paddingHorizontal: 12,
          borderRadius: radius.full,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          borderWidth: 1,
          borderColor: selected ? colors.accent.default : colors.border.strong,
          backgroundColor: selected
            ? colors.accent['subtle-bg']
            : pressed
              ? colors.bg.pressed
              : 'transparent',
        },
        style,
      ]}
    >
      {selected ? (
        <Check size={14} color={fg} strokeWidth={2.25} />
      ) : Icon ? (
        <Icon size={14} color={fg} strokeWidth={1.75} />
      ) : null}
      <Text variant={size === 'sm' ? 'label-s' : 'label-m'} style={{ color: fg, flexShrink: 1 }}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${t('common.close')}`}
          hitSlop={10}
        >
          <X size={14} color={fg} strokeWidth={2} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
