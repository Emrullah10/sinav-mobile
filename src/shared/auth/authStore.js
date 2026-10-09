import { create } from 'zustand';

/**
 * status: 'unknown' (açılış, bootstrap sürüyor) | 'authenticated' | 'unauthenticated'.
 * Token'lar burada DEĞİL (bkz. tokenStorage). sessionEndedCode: SYS-07 alt sayfasını tetikler.
 */
export const useAuthStore = create((set) => ({
  status: 'unknown',
  user: null,
  permissions: [],
  isGuest: false,
  sessionEndedCode: null,
  setAuthenticated: ({ user, permissions }) =>
    set({
      status: 'authenticated',
      user,
      permissions: permissions || user?.permissions || [],
      isGuest: Boolean(user?.isGuest ?? user?.userAccountRole === 'guest'),
      sessionEndedCode: null,
    }),
  setUnauthenticated: (sessionEndedCode = null) =>
    set({
      status: 'unauthenticated',
      user: null,
      permissions: [],
      isGuest: false,
      sessionEndedCode,
    }),
  clearSessionEnded: () => set({ sessionEndedCode: null }),
}));

export const authState = () => useAuthStore.getState();
