import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, ListRow, ProgressBar, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, formatDate, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { PLAN_KINDS, useOfferings, usePurchaseActions } from '@features/pay/usePurchases';
import { purchasesEnabled } from '@shared/purchases/purchases';
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

function Current({ ent, sub, onManage }) {
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
      {sub.store?.managed ? (
        <View style={{ gap: 8 }}>
          <Banner tone="info" message={t('pay.store')} />
          <Button title={t('pay.manage')} variant="secondary" size="md" fullWidth={false} onPress={onManage} />
        </View>
      ) : null}
      {sub.hasSubscription && sub.subscription?.channel === 'web' ? <Banner tone="info" message={t('pay.webManaged')} /> : null}
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

function Benefits() {
  const { t } = useT();
  const { colors } = useTheme();
  const query = useQuery({
    queryKey: queryKeys.billing.products(),
    queryFn: async () => unwrap(await api.billingPublicProductsList()),
  });
  return (
    <QueryBoundary query={query}>
      {(d) => {
        const premium = d.products.find((p) => p.productKey === 'premium-annual') || d.products.find((p) => p.prices?.[0]?.amount > 0);
        const free = d.products.find((p) => p.prices?.[0]?.amount === 0);
        return (
          <View style={{ gap: 8 }}>
            <Text variant="heading-3">{t('pay.benefits')}</Text>
            {FEATURE_ORDER.map((k) => ({ p: premium?.features?.find((f) => f.feature === k), f: free?.features?.find((f) => f.feature === k) }))
              .filter((x) => x.p)
              .map(({ p, f }) => (
                <View key={p.feature} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {p.enabled ? <Check size={16} color={colors.success.fg} /> : <X size={16} color={colors.text.tertiary} />}
                  <Text variant="body-s" style={{ flex: 1 }}>{t(`pay.feature.${p.feature}`)}</Text>
                  <Text variant="caption" color="secondary">{limitText(t, p)}</Text>
                  {f ? <Text variant="caption" color="tertiary">{`(${t('pay.tier.free')}: ${limitText(t, f)})`}</Text> : null}
                </View>
              ))}
          </View>
        );
      }}
    </QueryBoundary>
  );
}

const PERIOD_KEY = { monthly: 'pay.plan.monthlyPeriod', annual: 'pay.plan.annualPeriod', exam: 'pay.plan.examPeriod' };

function Paywall() {
  const { t } = useT();
  const toast = useToast();
  const offerings = useOfferings();
  const [picked, setPicked] = useState(null);
  const { purchase, restore } = usePurchaseActions();
  const plans = offerings.data || [];
  const current = plans.find((p) => p.kind === picked) || plans.find((p) => p.kind === 'exam') || plans[0];
  const busy = purchase.isPending || restore.isPending;

  const buy = async () => {
    if (!current) return;
    const r = await purchase.mutateAsync(current.pkg).catch(() => null);
    if (r?.synced?.active) toast.show({ message: t('pay.purchased'), tone: 'success' });
  };
  const doRestore = async () => {
    const r = await restore.mutateAsync().catch(() => null);
    if (r?.synced?.active) toast.show({ message: t('pay.restored'), tone: 'success' });
    else if (r) toast.show({ message: t('pay.restoreNone'), tone: 'info' });
  };
  const err = purchase.error || restore.error;
  const errMessage = err ? (err.response ? errorText(t, err) : t('pay.error.purchase')) : null;
  const processing = purchase.data?.synced && !purchase.data.synced.active;

  return (
    <View style={{ gap: 12 }}>
      <Text variant="heading-3">{t('pay.choose')}</Text>
      <QueryBoundary query={offerings}>
        {() =>
          plans.length === 0 ? (
            <Banner tone="warning" message={t('pay.unavailable')} />
          ) : (
            <View style={{ gap: 8 }}>
              {PLAN_KINDS.map((kind) => plans.find((p) => p.kind === kind)).filter(Boolean).map((p) => (
                <Card key={p.kind} selected={current?.kind === p.kind} onPress={() => setPicked(p.kind)} accessibilityLabel={t(`pay.plan.${p.kind}`)} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="title" style={{ flex: 1 }}>{t(`pay.plan.${p.kind}`)}</Text>
                    {p.kind === 'exam' ? <Text variant="label-s" color="accent">{t('pay.recommended')}</Text> : null}
                    {p.kind === 'monthly' && p.trial ? <Text variant="label-s" color="accent">{t('pay.trialBadge', { n: p.trialDays || 7 })}</Text> : null}
                  </View>
                  <Text variant="numeric-m">{p.priceString}</Text>
                  <Text variant="caption" color="tertiary">{t(PERIOD_KEY[p.kind])}</Text>
                </Card>
              ))}
              {errMessage ? <Banner tone="danger" message={errMessage} /> : null}
              {purchase.data?.pending ? <Banner tone="info" message={t('pay.pending')} /> : null}
              {processing ? <Banner tone="info" message={t('pay.processing')} /> : null}
              <Button
                title={current?.kind === 'monthly' && current.trial ? t('pay.cta.trial', { n: current.trialDays || 7 }) : t('pay.cta.continue')}
                loading={purchase.isPending}
                disabled={busy || !current}
                onPress={buy}
              />
              <Text variant="caption" color="tertiary">{current?.kind === 'exam' ? t('pay.legal.exam') : t('pay.legal.renew', { store: t('pay.storeName') })}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <Button title={t('pay.restore')} variant="tertiary" size="sm" fullWidth={false} loading={restore.isPending} disabled={busy} onPress={doRestore} />
                <Button title={t('me.legal.terms_of_use')} variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push('/yasal/terms_of_use')} />
                <Button title={t('me.legal.privacy_policy')} variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push('/yasal/privacy_policy')} />
              </View>
            </View>
          )
        }
      </QueryBoundary>
    </View>
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
  const { manage } = usePurchaseActions();
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
            <Benefits />
          </>
        ) : (
          <>
            <QueryBoundary query={ent}>
              {(e) => (
                <QueryBoundary query={sub}>
                  {(s) => (
                    <View style={{ gap: 16 }}>
                      <Current ent={e} sub={s} onManage={manage} />
                      <Usage ent={e} />
                      {s.tier !== 'premium' ? (
                        purchasesEnabled ? <Paywall /> : <Banner tone="warning" message={t('pay.unavailable')} />
                      ) : null}
                    </View>
                  )}
                </QueryBoundary>
              )}
            </QueryBoundary>
            <Benefits />
            <Invoices />
          </>
        )}
      </View>
    </Screen>
  );
}
