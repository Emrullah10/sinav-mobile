import { Text as RNText } from 'react-native';
import { READING_VARIANTS, useTheme } from '@theme';

const SEMANTIC = {
  primary: (c) => c.text.primary,
  reading: (c) => c.text.reading,
  secondary: (c) => c.text.secondary,
  tertiary: (c) => c.text.tertiary,
  disabled: (c) => c.text.disabled,
  inverse: (c) => c.text.inverse,
  link: (c) => c.text.link,
  'on-accent': (c) => c.text['on-accent'],
  accent: (c) => c.accent.default,
  danger: (c) => c.danger.fg,
  success: (c) => c.success.fg,
  warning: (c) => c.warning.fg,
};

/**
 * Tipografi bileşeni.
 * variant: display-l|display-m|heading-1|heading-2|heading-3|title|body-l|body-m|body-s|label-l|label-m|label-s|
 *          caption|overline|reading-l|reading-m|reading-s|numeric-xl|numeric-l|numeric-m
 * color: anlamsal ad (primary, secondary, tertiary, disabled, inverse, link, on-accent, accent, danger, success, warning)
 *        ya da ham renk. Okuma varyantları (reading-*) Literata ile ve text.reading rengiyle çizilir.
 * Sistem yazı boyutu ölçeklemesi açıktır (üst sınır 2x); sabit yükseklik verilmez.
 */
export function Text({
  variant = 'body-m',
  color,
  italic = false,
  align,
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier = 2,
  ...rest
}) {
  const { colors, type } = useTheme();
  const t = type[variant] || type['body-m'];
  const isReading = READING_VARIANTS.includes(variant);
  const resolve = color ? SEMANTIC[color] : null;
  const fontFamily = italic && isReading ? 'Literata_400Regular_Italic' : t.fontFamily;
  const { family: _f, weight: _w, ...textStyle } = t;
  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...rest}
      style={[
        textStyle,
        {
          fontFamily,
          color: resolve
            ? resolve(colors)
            : color || (isReading ? colors.text.reading : colors.text.primary),
        },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

export default Text;
