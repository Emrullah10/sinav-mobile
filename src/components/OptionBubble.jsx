import { Check, X } from 'lucide-react-native';
import { View } from 'react-native';
import { useTheme } from '@theme';
import { Text } from './Text';

/**
 * Seçenek baloncuğu (24 pt harf). state: default|selected|correct|wrong|blank|disabled.
 * Renk + biçim birlikte: doğru ✓, yanlış ✕, seçili dolu, boş kesikli.
 */
export function OptionBubble({ letter, state = 'default', size = 24, style }) {
  const { colors } = useTheme();
  const pal = {
    default: { bg: 'transparent', border: colors.border.strong, fg: colors.text.secondary },
    selected: {
      bg: colors.accent.default,
      border: colors.accent.default,
      fg: colors.text['on-accent'],
    },
    correct: { bg: colors.success.fg, border: colors.success.fg, fg: colors.bg.surface },
    wrong: { bg: colors.danger.fg, border: colors.danger.fg, fg: colors.bg.surface },
    blank: { bg: colors.blank.bg, border: colors.blank.fg, fg: colors.blank.fg, dashed: true },
    disabled: { bg: colors.bg.canvas, border: colors.border.default, fg: colors.text.disabled },
  }[state];
  const Mark = state === 'correct' ? Check : state === 'wrong' ? X : null;
  return (
    <View
      accessible
      accessibilityLabel={letter}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderStyle: pal.dashed ? 'dashed' : 'solid',
          borderColor: pal.border,
          backgroundColor: pal.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {Mark ? (
        <Mark size={size * 0.62} color={pal.fg} strokeWidth={2.5} />
      ) : (
        <Text
          variant="label-s"
          allowFontScaling={false}
          style={{ color: pal.fg, fontSize: size * 0.5, lineHeight: size * 0.66, letterSpacing: 0 }}
        >
          {letter}
        </Text>
      )}
    </View>
  );
}
