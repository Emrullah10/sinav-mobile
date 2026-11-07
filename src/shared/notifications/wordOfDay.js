import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Günün kelimesi: sunucunun önümüzdeki günler için seçtiği kelimeler CİHAZDA tek seferlik yerel bildirim olarak kurulur
// (her gün öğlen). Uygulama her açılışta yeniden kurar; sunucu push'u yok.
const PREFIX = 'wotd-';
const CHANNEL = 'word-of-day';
export const WOTD_HOUR = 12;
export const WOTD_MINUTE = 30;

export const cancelWordOfDay = async () => {
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(all.filter((n) => String(n.identifier).startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
};

/**
 * items: [{ date: 'YYYY-MM-DD', itemCode, ... }] (cihazın yerel günleri). İzin yoksa hiçbir şey kurmaz (izin Ayarlar'dan istenir).
 * titleOf / bodyOf: bildirim metni (i18n çağıran tarafta). Dokununca kelimenin sayfası açılır.
 */
export const scheduleWordOfDay = async ({ items, titleOf, bodyOf, channelName }) => {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: channelName, importance: Notifications.AndroidImportance.DEFAULT });
  }
  await cancelWordOfDay();
  const soon = Date.now() + 60 * 1000;
  for (const w of items || []) {
    const [y, m, d] = String(w.date).split('-').map(Number);
    const at = new Date(y, m - 1, d, WOTD_HOUR, WOTD_MINUTE, 0);
    if (!(at.getTime() > soon)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${w.date}`,
      content: { title: titleOf(w), body: bodyOf(w), data: { link: `/vocabulary/${w.itemCode}` } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
      },
    });
  }
};
