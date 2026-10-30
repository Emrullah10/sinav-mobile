import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { report } from '@shared/monitoring/report';
import { getPurchases, identifyPurchases, purchasesEnabled } from '@shared/purchases/purchases';

/** Paywall sırası. RevenueCat offering paketleri: $rc_monthly, $rc_annual ve özel kimlik `exam_period`. */
export const PLAN_KINDS = ['monthly', 'annual', 'exam'];

const kindOf = (P, pkg) => {
  if (pkg.packageType === P.PACKAGE_TYPE.MONTHLY) return 'monthly';
  if (pkg.packageType === P.PACKAGE_TYPE.ANNUAL) return 'annual';
  if (pkg.identifier === 'exam_period') return 'exam';
  return null;
};

// Deneme süresi gün cinsine çevrilir (1 hafta → 7 gün).
const UNIT_DAYS = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mağaza fiyatlı paketler + deneme hakkı. Mağaza yerelleştirilmiş fiyat metnini verir (priceString). */
const loadPlans = async () => {
  const P = getPurchases();
  if (!P) return [];
  const offerings = await P.getOfferings();
  const pkgs = offerings.current?.availablePackages || [];
  const plans = pkgs
    .map((pkg) => ({ kind: kindOf(P, pkg), pkg }))
    .filter((p) => p.kind)
    .sort((a, b) => PLAN_KINDS.indexOf(a.kind) - PLAN_KINDS.indexOf(b.kind));
  const intro = plans.filter((p) => p.kind === 'monthly');
  let eligible = {};
  if (intro.length && Platform.OS === 'ios') {
    try {
      eligible = await P.checkTrialOrIntroductoryPriceEligibility(
        intro.map((p) => p.pkg.product.identifier),
      );
    } catch (err) {
      report(err, { where: 'purchases.eligibility' });
    }
  }
  return plans.map((p) => {
    const ip = p.pkg.product.introPrice;
    let trial = false;
    if (p.kind === 'monthly' && ip && ip.price === 0) {
      trial =
        Platform.OS === 'ios'
          ? eligible[p.pkg.product.identifier]?.status ===
            P.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
          : true;
    }
    return {
      ...p,
      priceString: p.pkg.product.priceString,
      trial,
      trialDays: trial ? (Number(ip.periodNumberOfUnits) || 1) * UNIT_DAYS[String(ip.periodUnit || 'DAY').toUpperCase()] : null,
    };
  });
};

export const useOfferings = () =>
  useQuery({
    queryKey: ['purchases', 'offerings'],
    enabled: purchasesEnabled,
    queryFn: loadPlans,
    staleTime: 5 * 60 * 1000,
  });

/** Satın alma sonrası sunucu erişimi hemen açsın diye senkron çağrısı (webhook gecikse bile). */
const syncAccess = async () => {
  let last = null;
  for (let i = 0; i < 3; i += 1) {
    try {
      last = unwrap(await api.billingStoreSync());
    } catch (err) {
      report(err, { where: 'purchases.sync' }); // ücret alınmış olabilir: hata yerine "işleniyor" gösterilir
      last = { active: false };
    }
    if (last?.active) return last;
    await sleep(1500);
  }
  return last;
};

const ensureIdentified = async () => {
  const code = unwrap(await api.identityAccountGet())?.code;
  if (!code) throw new Error('NO_ACCOUNT_CODE'); // hesaba bağlanamayan satın alma yapılmaz
  await identifyPurchases(code);
};

export function usePurchaseActions({ onSynced } = {}) {
  const qc = useQueryClient();
  const done = (result) => {
    qc.invalidateQueries();
    onSynced?.(result);
  };

  const purchase = useMutation({
    mutationFn: async (pkg) => {
      const P = getPurchases();
      await ensureIdentified();
      try {
        await P.purchasePackage(pkg);
      } catch (err) {
        if (err?.userCancelled) return { cancelled: true };
        if (err?.code === P.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { pending: true };
        if (err?.code === P.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return { synced: await syncAccess() };
        throw err;
      }
      return { synced: await syncAccess() };
    },
    onSuccess: (r) => {
      if (r?.synced) done(r.synced);
    },
    onError: (err) => report(err, { where: 'purchases.purchase' }),
  });

  const restore = useMutation({
    mutationFn: async () => {
      const P = getPurchases();
      await ensureIdentified();
      await P.restorePurchases();
      return { synced: await syncAccess() };
    },
    onSuccess: (r) => {
      if (r?.synced?.active) done(r.synced);
    },
    onError: (err) => report(err, { where: 'purchases.restore' }),
  });

  const manage = async () => {
    try {
      await getPurchases()?.showManageSubscriptions();
    } catch (err) {
      report(err, { where: 'purchases.manage' });
    }
  };

  return { purchase, restore, manage };
}
