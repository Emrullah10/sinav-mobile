import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Text } from './Text';

/**
 * Metin alanı: etiket ÜSTTE ve hep görünür (yer tutucu etiket değildir), yardımcı/hata metni altta.
 * Props: label, value, onChangeText, helperText, error (string), placeholder, secureTextEntry (göster/gizle düğmesi),
 * multiline, maxLength + showCounter, leading (düğüm), disabled, ve TextInput'un diğer tüm props'ları.
 * Yükseklik ≥ 48; çok satırda büyür (font ölçeğine açık).
 */
export const TextField = forwardRef(function TextField(
  {
    label,
    helperText,
    error,
    secureTextEntry,
    multiline,
    maxLength,
    showCounter,
    leading,
    disabled = false,
    value,
    style,
    inputStyle,
    ...rest
  },
  ref,
) {
  const { colors, radius, type } = useTheme();
  const { t } = useT();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error
    ? colors.danger.border
    : focused
      ? colors.border.focus
      : colors.border.input;
  const secure = secureTextEntry && hidden;
  const t15 = type['body-m'];
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text variant="label-m" color="secondary">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          minHeight: multiline ? 112 : 48,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 8,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          borderWidth: focused || error ? 2 : 1,
          borderColor,
          backgroundColor: disabled ? colors.bg.canvas : colors.bg.input,
        }}
      >
        {leading}
        <TextInput
          ref={ref}
          value={value}
          editable={!disabled}
          secureTextEntry={secure}
          multiline={multiline}
          maxLength={maxLength}
          accessibilityLabel={label}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.accent.default}
          cursorColor={colors.accent.default}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
          style={[
            {
              flex: 1,
              fontFamily: t15.fontFamily,
              fontSize: t15.fontSize,
              color: disabled ? colors.text.disabled : colors.text.primary,
              paddingVertical: multiline ? 12 : 10,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}
            hitSlop={8}
            style={{ minWidth: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            {hidden ? (
              <Eye size={20} color={colors.text.secondary} />
            ) : (
              <EyeOff size={20} color={colors.text.secondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View
          style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}
          accessibilityLiveRegion="polite"
        >
          <AlertCircle size={16} color={colors.danger.fg} style={{ marginTop: 2 }} />
          <Text variant="caption" color="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : helperText || (showCounter && maxLength) ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text variant="caption" color="tertiary" style={{ flex: 1 }}>
            {helperText}
          </Text>
          {showCounter && maxLength ? (
            <Text variant="caption" color="tertiary">{`${(value || '').length}/${maxLength}`}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});
