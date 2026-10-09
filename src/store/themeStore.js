import { create } from 'zustand';
import { persisted } from './persist';

/** mode: 'system' (varsayılan) | 'light' | 'dark' — kullanıcı tercihi kalıcıdır. */
export const useThemeStore = create(
  persisted(
    'theme',
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    (s) => ({ mode: s.mode }),
  ),
);
