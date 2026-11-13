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
import { registerPushToken } from './push';
import { cancelWordOfDay, scheduleWordOfDay } from './wordOfDay';

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
  // Günün kelimesi: tercihi açıksa önümüzdeki 7 günün kelimeleri (günde bir kez yenilenir).
  const wotdOn = authed && p != null && p.wordOfDayEnabled !== false;
  const today = localDay();
  const daily = useQuery({
    queryKey: ['content', 'vocabDaily', today],
    enabled: wotdOn,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async () => unwrap(await api.contentVocabDaily({ from: today, days: 7 })),
  });

  useEffect(() => {
    if (status === 'unauthenticated' || isGuest || (p && p.wordOfDayEnabled === false)) {
      cancelWordOfDay();
      return;
    }
    if (!wotdOn || !daily.data) return;
    scheduleWordOfDay({
      items: daily.data,
      channelName: t('wotd.channel'),
      titleOf: (w) => t(`wotd.title.${w.kind}`, { w: w.headword }),
      bodyOf: (w) => [w.meaning, w.example?.en ? `“${w.example.en}”` : null].filter(Boolean).join(' · '),
    }).catch((err) => report(err, { where: 'wordOfDay.schedule' }));
  }, [status, isGuest, wotdOn, p?.wordOfDayEnabled, daily.data, language]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // İzin zaten verilmişse push token'ı yenile (token değişebilir); izin penceresi çevrimiçi maçta açılır.
  useEffect(() => {
    if (authed) registerPushToken({ ask: false, locale: language });
  }, [authed, language]);

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
