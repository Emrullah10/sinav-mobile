import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Chip, Divider, Screen, Segmented, SwitchRow, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import i18n from '@shared/translation/i18n';
import { useT } from '@shared/translation/useT';
import { useThemeStore } from '@store/themeStore';
import { useUiStore } from '@store/uiStore';

const TIMES = ['07:00', '12:30', '20:00', '21:30'];
const MOCK_MODES = ['learning', 'quick', 'timed', 'standard', 'relaxed'];

function Section({ title, children }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="heading-3" style={{ marginBottom: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function Settings() {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const isGuest = useAuthStore((s) => s.isGuest);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { hapticsEnabled, soundEnabled, language, setHapticsEnabled, setSoundEnabled, setLanguage } = useUiStore();
  const account = !isGuest;

  const prefs = useQuery({
    queryKey: queryKeys.account.prefs(),
    enabled: account,
    queryFn: async () => unwrap(await api.identityPreferencesGet()),
  });
  const notif = useQuery({
    queryKey: queryKeys.account.notif(),
    enabled: account,
    queryFn: async () => unwrap(await api.identityNotificationPrefsGet()),
  });
  const learner = useQuery({
    queryKey: queryKeys.learning.settings(),
    enabled: account,
    queryFn: async () => unwrap(await api.learningSettingsGet()),
  });

  // Sunucudaki tercih cihazlar arası ilk değerdir; yerelde değişiklik yapılana kadar uygula.
  useEffect(() => {
    if (!prefs.data) return;
    if (prefs.data.theme && prefs.data.theme !== mode) setMode(prefs.data.theme);
    if (typeof prefs.data.hapticsEnabled === 'boolean') setHapticsEnabled(prefs.data.hapticsEnabled);
    if (typeof prefs.data.soundEnabled === 'boolean') setSoundEnabled(prefs.data.soundEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.data]);

  const patchPrefs = useMutation({
    mutationFn: async (body) => unwrap(await api.identityPreferencesUpdate(body)),
    onSuccess: (data) => qc.setQueryData(queryKeys.account.prefs(), data),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const patchNotif = useMutation({
    mutationFn: async (body) => unwrap(await api.identityNotificationPrefsUpdate(body)),
    onSuccess: (data) => qc.setQueryData(queryKeys.account.notif(), data),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const patchLearner = useMutation({
    mutationFn: async (body) => unwrap(await api.learningSettingsUpdate(body)),
    onSuccess: (data) => qc.setQueryData(queryKeys.learning.settings(), data),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });

  const syncPref = (body) => {
    if (account) patchPrefs.mutate(body);
  };
  const n = notif.data;

  return (
    <Screen header={<TopBar title={t('settings.title')} onBack={() => router.back()} />} edges={['bottom']}>
      <View style={{ gap: 24 }}>
        <Section title={t('settings.appearance')}>
          <Text variant="label-m" color="secondary">{t('settings.theme')}</Text>
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v);
              syncPref({ theme: v });
            }}
            options={['system', 'light', 'dark'].map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
          />
          <Text variant="label-m" color="secondary" style={{ marginTop: 12 }}>{t('settings.language')}</Text>
          <Segmented
            value={language || 'system'}
            onChange={(v) => {
              const next = v === 'system' ? null : v;
              setLanguage(next);
              if (next) i18n.changeLanguage(next);
              if (account && next) api.identityAccountUpdate({ locale: next }).catch(() => {});
            }}
            options={[
              { value: 'system', label: t('settings.language.system') },
              { value: 'tr', label: 'Türkçe' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Section>

        <Section title={t('settings.feedback')}>
          <SwitchRow
            label={t('settings.haptics')}
            description={t('settings.hapticsDesc')}
            value={hapticsEnabled}
            onValueChange={(v) => {
              setHapticsEnabled(v);
              syncPref({ hapticsEnabled: v });
            }}
          />
          <Divider />
          <SwitchRow
            label={t('settings.sound')}
            value={soundEnabled}
            onValueChange={(v) => {
              setSoundEnabled(v);
              syncPref({ soundEnabled: v });
            }}
          />
        </Section>

        {account && n ? (
          <Section title={t('settings.notifications')}>
            <SwitchRow label={t('settings.daily')} value={n.dailyReminderEnabled} onValueChange={(v) => patchNotif.mutate({ dailyReminderEnabled: v })} />
            {n.dailyReminderEnabled ? (
              <View style={{ gap: 8, paddingBottom: 8 }}>
                <Text variant="label-m" color="secondary">{t('settings.dailyTime')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TIMES.map((tm) => (
                    <Chip key={tm} label={tm} selected={n.dailyReminderTime === tm} onPress={() => patchNotif.mutate({ dailyReminderTime: tm })} />
                  ))}
                </View>
              </View>
            ) : null}
            <Divider />
            <SwitchRow label={t('settings.review')} value={n.reviewRemindersEnabled} onValueChange={(v) => patchNotif.mutate({ reviewRemindersEnabled: v })} />
            <Divider />
            <SwitchRow label={t('settings.mockSuggest')} value={n.mockSuggestionsEnabled} onValueChange={(v) => patchNotif.mutate({ mockSuggestionsEnabled: v })} />
            <Divider />
            <SwitchRow label={t('settings.weekly')} value={n.weeklyReportEmailEnabled} onValueChange={(v) => patchNotif.mutate({ weeklyReportEmailEnabled: v })} />
          </Section>
        ) : null}

        {account && learner.data ? (
          <Section title={t('settings.exam')}>
            <Text variant="label-m" color="secondary">{t('settings.mockMode')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MOCK_MODES.map((m) => (
                <Chip key={m} label={t(`enums.study_mode.${m}`)} selected={learner.data.defaultMockMode === m} onPress={() => patchLearner.mutate({ defaultMockMode: m })} />
              ))}
            </View>
            <Text variant="label-m" color="secondary" style={{ marginTop: 12 }}>{t('settings.extraTime')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[0, 25, 50].map((p) => (
                <Chip key={p} label={t(`settings.extraTime.${p}`)} selected={learner.data.extraTimePercent === p} onPress={() => patchLearner.mutate({ extraTimePercent: p })} />
              ))}
            </View>
          </Section>
        ) : null}

        {account ? <GoalSection /> : null}
      </View>
    </Screen>
  );
}

function GoalSection() {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const enrollment = useQuery({
    queryKey: queryKeys.learning.enrollment(),
    queryFn: async () => unwrap(await api.learningEnrollmentActiveGet()).enrollment,
  });
  const e = enrollment.data;
  const track = useQuery({
    queryKey: queryKeys.content.track(e?.track?.key),
    enabled: Boolean(e?.track?.key),
    queryFn: async () => unwrap(await api.contentPublicTrackGet(e.track.key)),
  });
  const update = useMutation({
    mutationFn: async (targetScore) => unwrap(await api.learningEnrollmentUpdate(e.code, { targetScore })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.learning.enrollment() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
      toast.show({ message: t('settings.saved'), tone: 'success' });
    },
    onError: (err) => toast.show({ message: errorText(t, err), tone: 'danger' }),
  });
  if (!e || !track.data) return null;
  return (
    <Section title={t('settings.goal')}>
      <Text variant="body-m" color="secondary">{`${e.track.name} · ${t('settings.goalScore')}`}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {track.data.goalPresets.map((p) => (
          <Chip key={p.targetScore} label={String(p.targetScore)} selected={e.targetScore === p.targetScore} onPress={() => update.mutate(p.targetScore)} />
        ))}
      </View>
    </Section>
  );
}
