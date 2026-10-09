import { router } from 'expo-router';
import { queryClient } from '@shared/providers/queryClient';
import { useOnboardingStore } from '@store/onboardingStore';
import { applyAuthResponse } from './session';

/** Kimlik ucu yanıtını uygular, sunucu önbelleğini sıfırlar ve açılış kapısına döner. */
export const finishAuth = async (data) => {
  await applyAuthResponse(data);
  queryClient.clear();
  useOnboardingStore.getState().setWelcomeSeen(true);
  router.replace('/');
};
