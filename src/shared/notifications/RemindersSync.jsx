import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { report } from '@shared/monitoring/report';
import { openDeepLink } from '@shared/navigation/deepLinks';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { cancelDailyReminder, scheduleDailyReminder } from './reminders';

/** Kayıtlı kullanıcının tercihine göre günlük yerel hatırlatmayı kurar/iptal eder; bildirime dokunma Bugün'e götürür. Görünmez. */
export function RemindersSync() {
  const { t, language } = useT();
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  const authed = status === 'authenticated' && !isGuest;
  const prefs = useQuery({
    queryKey: queryKeys.account.notif(),
    enabled: authed,
    staleTime: 60 * 1000,
    queryFn: async () => unwrap(await api.identityNotificationPrefsGet()),
  });
  const p = prefs.data;

  useEffect(() => {
    if (status === 'unauthenticated' || isGuest) {
      cancelDailyReminder();
      return;
    }
    if (!p) return;
    const job = p.dailyReminderEnabled
      ? scheduleDailyReminder({
          time: p.dailyReminderTime,
          title: t('reminder.title'),
          body: t('reminder.body'),
        })
      : cancelDailyReminder();
    Promise.resolve(job).catch((err) => report(err, { where: 'reminders.schedule' }));
  }, [status, isGuest, p?.dailyReminderEnabled, p?.dailyReminderTime, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const open = (response) => {
      const link = response?.notification?.request?.content?.data?.link;
      if (link) openDeepLink(link);
      else router.push('/today');
    };
    // Uygulama bildirime dokunularak soğuk açıldıysa son yanıtı da işle.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => r && open(r))
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
  return null;
}
