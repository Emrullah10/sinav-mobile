import { router } from 'expo-router';
import { useOnboardingStore } from '@store/onboardingStore';

/** Onboarding'den karşılama ekranına dön. Misafir oturumu kalır; "Başla" ile kaldığı adımdan devam edilir. */
export const backToWelcome = () => {
  useOnboardingStore.getState().setWelcomeSeen(false);
  router.replace('/welcome');
};
