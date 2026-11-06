import { create } from 'zustand';
import { persisted } from './persist';

/** mode: 'light' (varsayılan) | 'system' | 'dark' — kullanıcı tercihi kalıcıdır. */
export const useThemeStore = create(
  persisted(
    'theme',
    (set) => ({
      mode: 'light',
      setMode: (mode) => set({ mode }),
    }),
    (s) => ({ mode: s.mode }),
  ),
);
