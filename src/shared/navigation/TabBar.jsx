import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@components';
import { useTheme } from '@theme';

const PILL_W = 60;
const PILL_H = 32;

/** Tek sekme: seçiliyken ikonun arkasında petrol tonlu hap belirir (yay), ikon ve etiket koyulaşır. */
function TabItem({ label, icon: Icon, focused, onPress, onLongPress }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = reduced ? (focused ? 1 : 0) : focused ? withSpring(1, { damping: 20, stiffness: 260 }) : withTiming(0, { duration: 120 });
  }, [focused, reduced, on]);
  const pill = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scaleX: 0.55 + 0.45 * on.value }],
  }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -1 * on.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56 }}
    >
      <View style={{ width: PILL_W, height: PILL_H, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[{ position: 'absolute', top: 0, left: 0, width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: colors.accent['subtle-bg'] }, pill]}
        />
        <Animated.View style={icon}>
          <Icon size={22} color={focused ? colors.accent.default : colors.text.tertiary} strokeWidth={focused ? 2.25 : 1.75} />
        </Animated.View>
      </View>
      <Text
        variant="label-s"
        numberOfLines={1}
        style={{ fontSize: 12, letterSpacing: 0, color: focused ? colors.text.primary : colors.text.tertiary, fontWeight: focused ? '600' : '500' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Alt sekme çubuğu (expo-router Tabs `tabBar`): 5 sekme, ikon + etiket hep görünür.
 * items: { [routeName]: { label, icon } }. Seçili sekme Material 3 tarzı hap göstergesiyle işaretlenir.
 */
export function TabBar({ state, navigation, items }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bg.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border.default,
        paddingTop: 6,
        paddingHorizontal: 4,
        paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom - 6, 8) : Math.max(insets.bottom, 8),
      }}
    >
      {state.routes.map((route, index) => {
        const item = items[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
        return <TabItem key={route.key} label={item.label} icon={item.icon} focused={focused} onPress={onPress} onLongPress={onLongPress} />;
      })}
    </View>
  );
}
