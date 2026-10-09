import { deepLinks } from './deepLinks';

/** Mevcut kayda göre onboarding'in hangi adımından sürüleceği. */
export const onboardingRoute = (enrollment) => {
  if (!enrollment) return '/baslangic';
  const diag = enrollment.diagnostic?.status;
  if (!enrollment.availability?.length) return '/musaitlik';
  if (diag === 'completed' || diag === 'skipped') return '/plan-onizleme';
  return deepLinks.diagnostic;
};
