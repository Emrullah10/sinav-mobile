import { createContext, useContext, useEffect, useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { tokens } from '@shared/vendor/design-tokens/tokens.js';
import { useThemeStore } from '@store/themeStore';
import { buildElevation } from './elevation';
import { typeScale } from './typography';

const ThemeContext = createContext(null);

/** mode: 'system' | 'light' | 'dark'. 'system' cihaz görünümünü izler; kullanıcı seçimi kalıcıdır. */
export function ThemeProvider({ children }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const system = useColorScheme();

  // Yerel bileşenlerin (alt sayfa, klavye, uyarılar) da seçilen görünümü izlemesi için.
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? null : mode);
  }, [mode]);

  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo(() => {
    const isDark = scheme === 'dark';
    const colors = tokens[scheme];
    return {
      colors,
      space: tokens.space,
      radius: tokens.radius,
      motion: tokens.motion,
      type: typeScale,
      elevation: buildElevation(colors, isDark),
      isDark,
      scheme,
      mode,
      setMode,
    };
  }, [scheme, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme: ThemeProvider dışında kullanıldı');
  return ctx;
};
