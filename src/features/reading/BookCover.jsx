import { FileText } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@components';
import { useTheme } from '@theme';

const hash = (s) => [...String(s)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Üretilen kapak: renk başlıktan gelir, aynı kitap her yerde aynı görünür. width: px. */
export function BookCover({ book, width = 96 }) {
  const { colors, radius } = useTheme();
  const tones = [
    { bg: colors.accent.default, fg: colors.text['on-accent'] },
    { bg: colors.bg.inverse, fg: colors.text.inverse },
    { bg: colors.chart['series-3'], fg: colors.text['on-accent'] },
  ];
  const tone = tones[hash(book.title) % tones.length];
  const pad = Math.max(6, Math.round(width * 0.09));
  const titleSize = Math.max(9, Math.round(width * 0.095));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: tone.bg, padding: 4 }}
    >
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: tone.fg,
          opacity: 0.92,
          borderRadius: radius.sm,
          padding: pad,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {book.kind === 'personal' ? <FileText size={Math.round(titleSize * 1.2)} color={tone.fg} /> : <View />}
        <View style={{ gap: 2 }}>
          <Text variant="reading-s" numberOfLines={4} allowFontScaling={false} style={{ color: tone.fg, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.22) }}>
            {book.title}
          </Text>
          {book.author ? (
            <Text variant="caption" numberOfLines={1} allowFontScaling={false} style={{ color: tone.fg, fontSize: Math.max(9, titleSize - 3), lineHeight: titleSize }}>
              {book.author}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
