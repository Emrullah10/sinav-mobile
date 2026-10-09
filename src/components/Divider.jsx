import { View } from 'react-native';
import { useTheme } from '@theme';

/** İnce ayırıcı (1 px, border.subtle). inset: soldan boşluk. vertical: dikey. */
export function Divider({ inset = 0, vertical = false, strong = false, style }) {
  const { colors } = useTheme();
  const color = strong ? colors.border.default : colors.border.subtle;
  return (
    <View
      accessibilityRole="none"
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: color }
          : { height: 1, marginLeft: inset, backgroundColor: color },
        style,
      ]}
    />
  );
}
