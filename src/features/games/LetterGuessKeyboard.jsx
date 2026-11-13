import { CornerDownLeft, Delete } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Text } from '@components';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** Ekran klavyesi. keys: harf → 'correct' | 'present' | 'absent' (şimdiye kadarki en iyi durum). */
export function LetterGuessKeyboard({ keys, onLetter, onDelete, onSubmit, disabled }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const keyStyle = (state) => {
    if (state === 'correct') return { bg: colors.success.fg, fg: colors.bg.surface, border: colors.success.fg };
    if (state === 'present') return { bg: colors.warning.bg, fg: colors.warning.fg, border: colors.warning.fg };
    if (state === 'absent') return { bg: colors.bg.canvas, fg: colors.text.disabled, border: colors.border.default };
    return { bg: colors.border.default, fg: colors.text.primary, border: colors.border.default };
  };
  const Key = ({ children, onPress, state, flex = 1, label }) => {
    const p = keyStyle(state);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        hitSlop={2}
        style={({ pressed }) => ({
          flex, height: 52, borderRadius: radius.sm, backgroundColor: p.bg, borderWidth: state === 'present' ? 2 : 0, borderColor: p.border, borderBottomWidth: pressed ? 1 : 3, borderBottomColor: state === 'present' ? p.border : 'rgba(0,0,0,0.3)',
          alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.55 : pressed ? 0.7 : 1, transform: [{ translateY: pressed ? 2 : 0 }],
        })}
      >
        {typeof children === 'string'
          ? <Text allowFontScaling={false} style={{ color: p.fg, fontWeight: '700', fontSize: 16, textTransform: 'uppercase' }}>{children}</Text>
          : children}
      </Pressable>
    );
  };
  return (
    <View style={{ gap: 6, width: '100%', maxWidth: 520 }}>
      {ROWS.map((row, i) => (
        <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          {i === 2 ? <Key flex={1.5} onPress={onSubmit} label={t('games.letterGuess.submit')}><CornerDownLeft size={18} color={colors.text.primary} /></Key> : null}
          {[...row].map((ch) => (
            <Key key={ch} state={keys[ch]} onPress={() => onLetter(ch)} label={keys[ch] ? `${ch.toUpperCase()}, ${t(`games.letterGuess.${keys[ch]}`)}` : ch.toUpperCase()}>{ch}</Key>
          ))}
          {i === 2 ? <Key flex={1.5} onPress={onDelete} label={t('games.letterGuess.delete')}><Delete size={18} color={colors.text.primary} /></Key> : null}
        </View>
      ))}
    </View>
  );
}
