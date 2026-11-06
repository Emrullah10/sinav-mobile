import { BookOpen, CalendarCheck, ClipboardCheck, GraduationCap, User } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '@hooks/useHaptics';
import { useAuthStore } from '@shared/auth/authStore';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { BackgroundScope } from '@features/background/BackgroundScope';

const TABS = [
  { name: 'today', label: 'tabs.today', icon: CalendarCheck },
  { name: 'study', label: 'tabs.study', icon: BookOpen },
  { name: 'exams', label: 'tabs.exam', icon: ClipboardCheck },
  { name: 'tutor', label: 'tabs.tutor', icon: GraduationCap },
  { name: 'me', label: 'tabs.me', icon: User },
];

/** Alt sekme çubuğu: 5 sekme, ikon + etiket hep görünür, seçili sekme petrol (tasarım §7.3). */
export default function TabsLayout() {
  const { colors, type } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  // Misafir çalışma ekranlarını kullanamaz (learning:study yalnız öğrenci): onboarding'e / girişe yönlendir.
  if (status === 'authenticated' && isGuest) return <Redirect href="/" />;
  return (
    <BackgroundScope>
      <Tabs
        screenListeners={{ tabPress: () => haptics.select() }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent.default,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarLabelStyle: {
            fontFamily: type['label-s'].fontFamily,
            fontSize: 12,
            letterSpacing: 0,
            marginTop: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.bg.surface,
            borderTopColor: colors.border.default,
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingTop: 6,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 6),
          },
          sceneStyle: { backgroundColor: colors.bg.canvas },
        }}
      >
        {TABS.map(({ name, label, icon: Icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(label),
              tabBarAccessibilityLabel: t(label),
              tabBarIcon: ({ color, focused }) => (
                <Icon size={24} color={color} strokeWidth={focused ? 2.25 : 1.75} />
              ),
            }}
          />
        ))}
      </Tabs>
    </BackgroundScope>
  );
}
