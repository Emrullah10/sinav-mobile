import { deepLinks } from './deepLinks';

/** Mevcut kayda göre onboarding'in hangi adımından sürüleceği. */
export const onboardingRoute = (enrollment) => {
  if (!enrollment) return '/onboarding';
  const diag = enrollment.diagnostic?.status;
  if (!enrollment.availability?.length) return '/availability';
  if (diag === 'completed' || diag === 'skipped') return '/plan-preview';
  return deepLinks.diagnostic;
};
