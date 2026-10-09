import { create } from 'zustand';
import { persisted } from './persist';

/** Karşılama / ONB ilerlemesi (cihazda). Sunucudaki durum esastır; bu yalnız yerel ipucudur. */
export const useOnboardingStore = create(
  persisted(
    'onboarding',
    (set) => ({
      welcomeSeen: false,
      completed: false,
      step: 0,
      setWelcomeSeen: (welcomeSeen = true) => set({ welcomeSeen }),
      setStep: (step) => set({ step }),
      complete: () => set({ completed: true }),
      reset: () => set({ welcomeSeen: false, completed: false, step: 0 }),
    }),
    (s) => ({ welcomeSeen: s.welcomeSeen, completed: s.completed, step: s.step }),
  ),
);
