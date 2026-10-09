import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { View } from 'react-native';
import { Banner, Button, Card, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, formatDate, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const FEATURE_ORDER = [
  'questions_per_day', 'tutor_messages_per_day', 'flashcard_reviews_per_day', 'translation_evals_per_day',
  'mini_exams_per_month', 'full_exams_per_month', 'detailed_analysis', 'score_estimate',
];

const limitText = (t, f) => {
  if (!f.enabled) return t('pay.notIncluded');
  if (f.limit == null) return f.period ? t('pay.unlimited') : t('pay.included');
  return t(`pay.limit.${f.period}`, { n: f.limit });
};

function Current({ ent, sub }) {
  const { t, language } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const resume = useMutation({
    mutationFn: async () => unwrap(await api.billingSubscriptionResume()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
      qc.invalidateQueries({ queryKey: queryKeys.billing.entitlements() });
      toast.show({ message: t('pay.resumed'), tone: 'success' });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const s = sub.subscription;
  const date = (v) => formatDate(v, language, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Card elevation="e1" style={{ gap: 6 }}>
      <Text variant="overline" color="tertiary">{t('pay.current')}</Text>
      <Text variant="heading-1">{sub.plan?.name || ent.planName || t(`pay.tier.${ent.tier}`)}</Text>
      <Text variant="body-m" color="secondary">{`${t('pay.status')}: ${sub.hasSubscription ? t(`enums.subscription_status.${sub.status}`) : t('pay.tier.free')}`}</Text>
      {ent.trial?.active ? <Text variant="body-s" color="secondary">{t('pay.trialDays', { n: ent.trial.daysLeft })}</Text> : null}
      {sub.validUntil && sub.tier === 'premium' ? <Text variant="body-s" color="secondary">{t('pay.validUntil', { date: date(sub.validUntil) })}</Text> : null}
      {s?.willRenew && s.renewalDate ? <Text variant="body-s" color="secondary">{t('pay.renews', { date: date(s.renewalDate), amount: s.renewalAmount })}</Text> : null}
      {s?.pausedUntil ? <Banner tone="info" message={t('pay.paused', { date: date(s.pausedUntil) })} /> : null}
      {sub.status === 'past_due' && s?.accessUntil ? <Banner tone="warning" message={t('pay.pastDue', { date: date(s.accessUntil) })} /> : null}
      {s?.cancelAtPeriodEnd ? (
        <View style={{ gap: 8 }}>
          <Banner tone="info" message={t('pay.cancelsAtEnd')} />
          {!sub.store?.managed ? (
            <Button title={t('pay.resume')} variant="secondary" size="md" fullWidth={false} loading={resume.isPending} onPress={() => resume.mutate()} />
          ) : null}
        </View>
      ) : null}
      {sub.store?.managed ? <Banner tone="info" message={t('pay.store')} /> : null}
    </Card>
  );
}

function Usage({ ent }) {
  const { t } = useT();
  const { colors } = useTheme();
  const rows = FEATURE_ORDER.map((k) => ent.features?.[k]).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      <Text variant="heading-3">{t('pay.usage')}</Text>
      {rows.map((f) => (
        <View key={f.feature} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {f.enabled ? <Check size={16} color={colors.success.fg} /> : <X size={16} color={colors.text.tertiary} />}
            <Text variant="body-m" style={{ flex: 1 }}>{t(`pay.feature.${f.feature}`)}</Text>
            <Text variant="label-m" color="secondary">
              {f.enabled && f.limit != null ? t('pay.used', { used: f.used ?? 0, limit: f.limit }) : limitText(t, f)}
            </Text>
          </View>
          {f.enabled && f.limit != null ? <ProgressBar value={Math.min(1, (f.used ?? 0) / f.limit)} height={4} /> : null}
        </View>
      ))}
    </View>
  );
}

function Catalog() {
  const { t, language } = useT();
  const { colors } = useTheme();
  const query = useQuery({
    queryKey: queryKeys.billing.products(),
    queryFn: async () => unwrap(await api.billingPublicProductsList()),
  });
  return (
    <QueryBoundary query={query}>
      {(d) => (
        <View style={{ gap: 8 }}>
          <Text variant="heading-3">{t('pay.catalog')}</Text>
          {d.nextExam ? (
            <Text variant="caption" color="tertiary">
              {t('pay.nextExam', { date: formatDate(d.nextExam.examDate, language, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </Text>
          ) : null}
          {d.products.map((p) => {
            const price = p.prices?.[0];
            return (
              <Card key={p.productKey} style={{ gap: 6 }} selected={p.recommended}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="title" style={{ flex: 1 }}>{p.name}</Text>
                  {p.recommended ? <Text variant="label-s" color="accent">{t('pay.recommended')}</Text> : null}
                </View>
                <Text variant="body-s" color="secondary">{p.description}</Text>
                {price ? (
                  <Text variant="numeric-m">
                    {price.amount === 0 ? t('pay.tier.free') : t('pay.price', { amount: price.amount })}
                  </Text>
                ) : null}
                {price?.amount > 0 && price.monthlyEquivalent ? (
                  <Text variant="caption" color="tertiary">{t('pay.perMonth', { n: price.monthlyEquivalent })}</Text>
                ) : null}
                {FEATURE_ORDER.map((k) => p.features?.find((f) => f.feature === k)).filter(Boolean).map((f) => (
                  <View key={f.feature} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {f.enabled ? <Check size={14} color={colors.success.fg} /> : <X size={14} color={colors.text.tertiary} />}
                    <Text variant="body-s" style={{ flex: 1 }}>{t(`pay.feature.${f.feature}`)}</Text>
                    <Text variant="caption" color="secondary">{limitText(t, f)}</Text>
                  </View>
                ))}
              </Card>
            );
          })}
        </View>
      )}
    </QueryBoundary>
  );
}

function Invoices() {
  const { t, language } = useT();
  const query = useQuery({
    queryKey: queryKeys.billing.invoices(),
    queryFn: async () => unwrap(await api.billingInvoicesList()).items,
  });
  if (!query.data?.length) return null;
  return (
    <View>
      <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('pay.invoices')}</Text>
      {query.data.map((inv, i) => (
        <ListRow
          key={inv.code}
          title={inv.planName}
          subtitle={formatDate(inv.createdAt, language, { day: 'numeric', month: 'long', year: 'numeric' })}
          value={`${inv.total} ₺`}
          chevron={false}
          divider={i < query.data.length - 1}
        />
      ))}
    </View>
  );
}

export default function Premium() {
  const { t } = useT();
  const isGuest = useAuthStore((s) => s.isGuest);
  const ent = useQuery({
    queryKey: queryKeys.billing.entitlements(),
    enabled: !isGuest,
    queryFn: async () => unwrap(await api.billingEntitlementsGet()),
  });
  const sub = useQuery({
    queryKey: queryKeys.billing.subscription(),
    enabled: !isGuest,
    queryFn: async () => unwrap(await api.billingSubscriptionGet()),
  });
  return (
    <Screen
      header={<TopBar title={t('pay.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/bugun'))} />}
      edges={['bottom']}
      onRefresh={() => { ent.refetch(); sub.refetch(); }}
      refreshing={(ent.isRefetching || sub.isRefetching) && !ent.isPending}
    >
      <View style={{ gap: 16 }}>
        {isGuest ? (
          <>
            <Banner tone="info" message={t('pay.guest')} action={{ label: t('me.createAccount'), onPress: () => router.push('/kayit') }} />
            <Catalog />
          </>
        ) : (
          <>
            <QueryBoundary query={ent}>
              {(e) => (
                <QueryBoundary query={sub}>
                  {(s) => (
                    <View style={{ gap: 16 }}>
                      <Current ent={e} sub={s} />
                      {e.trial?.eligible && e.trial.trialDays ? (
                        <Banner tone="info" message={t('pay.trialEligible', { n: e.trial.trialDays })} />
                      ) : null}
                      <Usage ent={e} />
                    </View>
                  )}
                </QueryBoundary>
              )}
            </QueryBoundary>
            <Catalog />
            <Banner tone="info" message={t('pay.webOnly')} />
            <Invoices />
          </>
        )}
      </View>
    </Screen>
  );
}
