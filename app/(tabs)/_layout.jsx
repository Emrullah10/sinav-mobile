import { BookOpen, CalendarCheck, ClipboardCheck, GraduationCap, User } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';
import { useHaptics } from '@hooks/useHaptics';
import { useAuthStore } from '@shared/auth/authStore';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { BackgroundScope } from '@features/background/BackgroundScope';
import { TabBar } from '@shared/navigation/TabBar';

const TABS = [
  { name: 'today', label: 'tabs.today', icon: CalendarCheck },
  { name: 'study', label: 'tabs.study', icon: BookOpen },
  { name: 'exams', label: 'tabs.exam', icon: ClipboardCheck },
  { name: 'tutor', label: 'tabs.tutor', icon: GraduationCap },
  { name: 'me', label: 'tabs.me', icon: User },
];

/** Alt sekme çubuğu: 5 sekme, ikon + etiket hep görünür; seçili sekme hap göstergeli (TabBar). */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useT();
  const haptics = useHaptics();
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  // Misafir çalışma ekranlarını kullanamaz (learning:study yalnız öğrenci): onboarding'e / girişe yönlendir.
  if (status === 'authenticated' && isGuest) return <Redirect href="/" />;
  const items = Object.fromEntries(TABS.map(({ name, label, icon }) => [name, { label: t(label), icon }]));
  return (
    <BackgroundScope>
      <Tabs
        tabBar={(props) => <TabBar {...props} items={items} />}
        screenListeners={{ tabPress: () => haptics.select() }}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg.canvas } }}
      >
        {TABS.map(({ name, label }) => (
          <Tabs.Screen key={name} name={name} options={{ title: t(label), tabBarAccessibilityLabel: t(label) }} />
        ))}
      </Tabs>
    </BackgroundScope>
  );
}
