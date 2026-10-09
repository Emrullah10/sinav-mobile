import { Switch, View } from 'react-native';
import { useHaptics } from '@hooks/useHaptics';
import { useTheme } from '@theme';
import { Text } from './Text';

/** Ayar satırı + anahtar (56). Yalnız anında etkili ayarlar için. Satırın tamamı erişilebilirlik hedefidir. */
export function SwitchRow({ label, description, value, onValueChange, disabled = false, style }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <View
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => !disabled && onValueChange?.(!value)}
      style={[
        { minHeight: 56, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 16 },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" color={disabled ? 'disabled' : 'primary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="body-s" color="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          haptics.select();
          onValueChange?.(v);
        }}
        trackColor={{ false: colors.border.strong, true: colors.accent.default }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border.strong}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}
