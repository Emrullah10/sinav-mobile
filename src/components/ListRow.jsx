import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useTheme } from '@theme';
import { Divider } from './Divider';
import { Text } from './Text';

/**
 * Liste satırı (56; altmetin varsa 72+). leading/trailing: herhangi bir düğüm (ikon, avatar, Switch…).
 * value: sağda ikincil değer metni. onPress verilirse tüm satır hedeftir ve ok (chevron) görünür (chevron={false} ile gizlenir).
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  value,
  onPress,
  chevron,
  divider = false,
  selected = false,
  accessibilityLabel,
  style,
  testID,
}) {
  const { colors, space } = useTheme();
  const showChevron = chevron ?? Boolean(onPress);
  const content = (
    <View
      style={[
        {
          minHeight: subtitle ? 72 : 56,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[4],
        },
        style,
      ]}
    >
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body-s" color="secondary" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body-m" color="secondary">
          {value}
        </Text>
      ) : null}
      {trailing ? <View>{trailing}</View> : null}
      {showChevron ? (
        <ChevronRight size={20} color={colors.text.tertiary} strokeWidth={1.75} />
      ) : null}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel || [title, subtitle, value].filter(Boolean).join(', ')
          }
          accessibilityState={{ selected }}
          onPress={onPress}
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? colors.bg.pressed
              : selected
                ? colors.bg.selected
                : 'transparent',
          })}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
      {divider ? <Divider /> : null}
    </View>
  );
}
