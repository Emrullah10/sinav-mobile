import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CreditCard, FileText, LifeBuoy, MessageSquareWarning, Settings, UserRound } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, ListRow, ProgressBar, Screen, Skeleton, Text, TopBar } from '@components';
import { api } from '@api';
import { formatScore, targetScoreOf, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { signOut } from '@shared/auth/session';
import { deepLinks } from '@shared/navigation/deepLinks';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { APP_VERSION } from '@shared/constant/config';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Alert } from 'react-native';

export default function MeScreen() {
  const { t, language } = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const progress = useQuery({
    queryKey: queryKeys.learning.progress(7),
    enabled: authed && !isGuest,
    queryFn: async () => unwrap(await api.learningProgressOverviewGet(7)),
  });
  const ent = useQuery({
    queryKey: queryKeys.billing.entitlements(),
    enabled: authed && !isGuest,
    queryFn: async () => unwrap(await api.billingEntitlementsGet()),
  });
  const p = progress.data;
  const icon = (Icon) => <Icon size={22} color={colors.text.secondary} />;
  const confirmSignOut = () =>
    Alert.alert(t('me.signOut.confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('me.signOut'), style: 'destructive', onPress: () => signOut().then(() => router.replace('/sign-in')) },
    ]);

  return (
    <Screen header={<TopBar variant="large" title={t('me.title')} />}>
      <View style={{ gap: 16 }}>
        <Card style={{ gap: 4 }}>
          <Text variant="heading-2">{isGuest ? t('me.guest') : user?.displayName || user?.email || ''}</Text>
          {!isGuest && user?.email ? <Text variant="body-m" color="secondary">{user.email}</Text> : null}
          {isGuest ? (
            <>
              <Text variant="body-m" color="secondary">{t('me.guestBody')}</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                <Button title={t('me.createAccount')} onPress={() => router.push('/sign-up')} />
                <Button title={t('me.signIn')} variant="tertiary" onPress={() => router.push('/sign-in')} />
              </View>
            </>
          ) : null}
        </Card>

        {!isGuest ? (
          <Card onPress={() => router.push('/me/progress')} accessibilityLabel={t('me.progress')} style={{ gap: 8 }}>
            <Text variant="heading-3">{t('me.progress')}</Text>
            {progress.isPending ? (
              <Skeleton height={48} />
            ) : p ? (
              <>
                {p.estimate ? (
                  <Text variant="numeric-l">{t('today.estimate.range', { low: formatScore(p.estimate.low, language), high: formatScore(p.estimate.high, language) })}</Text>
                ) : null}
                {targetScoreOf(p.target) ? <ProgressBar value={p.estimate ? Math.min(1, p.estimate.point / targetScoreOf(p.target)) : 0} /> : null}
                <Text variant="body-s" color="secondary">
                  {[t('progress.minutes', { n: p.totals.activeMinutes }), t('progress.questions', { n: p.totals.questionsAnswered }), t('progress.activeDays', { n: p.totals.activeDays })].join(' · ')}
                </Text>
              </>
            ) : null}
          </Card>
        ) : null}

        <View>
          {!isGuest ? (
            <ListRow
              leading={icon(CreditCard)}
              title={t('me.plan')}
              value={ent.data ? t(`pay.tier.${ent.data.tier}`) : undefined}
              onPress={() => router.push('/premium')}
              divider
            />
          ) : null}
          <ListRow leading={icon(Settings)} title={t('me.settings')} onPress={() => router.push('/me/settings')} divider />
          <ListRow leading={icon(MessageSquareWarning)} title={t('feedback.title')} subtitle={t('feedback.open')} onPress={() => router.push(deepLinks.feedback)} divider />
          <ListRow leading={icon(LifeBuoy)} title={t('me.support')} onPress={() => router.push(deepLinks.help)} divider />
          {!isGuest ? <ListRow leading={icon(UserRound)} title={t('me.account')} onPress={() => router.push('/me/account')} divider /> : null}
          {!isGuest ? <ListRow leading={icon(BarChart3)} title={t('me.progress')} onPress={() => router.push('/me/progress')} divider /> : null}
          {['kvkk_notice', 'privacy_policy', 'terms_of_use', 'cancellation_refund'].map((type, i, arr) => (
            <ListRow
              key={type}
              leading={i === 0 ? icon(FileText) : <View style={{ width: 22 }} />}
              title={t(`me.legal.${type}`)}
              onPress={() => router.push(`/legal/${type}`)}
              divider={i < arr.length - 1}
            />
          ))}
        </View>

        {!isGuest ? <Button title={t('me.signOut')} variant="secondary" onPress={confirmSignOut} /> : null}
        <Text variant="caption" color="tertiary" align="center">{t('me.version', { v: APP_VERSION })}</Text>
      </View>
    </Screen>
  );
}
