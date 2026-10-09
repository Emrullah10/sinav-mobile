import { Stack } from 'expo-router';

/** Odak modu: sekme çubuğu yok; soru, deneme, kelime oturumu ve seviye tespiti bu grupta. */
export default function FocusLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }}
    />
  );
}
