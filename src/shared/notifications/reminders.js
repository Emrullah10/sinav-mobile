import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Günlük çalışma hatırlatması CİHAZDA yerel bildirim olarak kurulur (sunucu push'u yok).
const ID = 'daily-reminder';
const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** İzin yoksa ister; verilmediyse false döner (kullanıcıya ayarlardan açması söylenir). */
export const ensureNotificationPermission = async () => {
  // Android 13+: izin penceresi için kanal önce var olmalı.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'ODAK',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return Boolean(next.granted);
};

export const cancelDailyReminder = () =>
  Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});

/** time: 'HH:MM' (cihazın yerel saati). Aynı kimlikle yeniden kurmak eskisini değiştirir. */
export const scheduleDailyReminder = async ({ time, title, body }) => {
  const [hour, minute] = String(time || '20:00')
    .split(':')
    .map((x) => Number(x) || 0);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: title,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title, body, data: { link: '/today' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
    },
  });
};
