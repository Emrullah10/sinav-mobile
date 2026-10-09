import { Platform } from 'react-native';

const shadow = (offsetY, radius, opacity, elevation) =>
  Platform.select({
    ios: {
      shadowColor: '#13232A',
      shadowOffset: { width: 0, height: offsetY },
      shadowRadius: radius,
      shadowOpacity: opacity,
    },
    default: { elevation },
  });

/** Tasarım §7.6: koyu temada gölge yok, daha açık yüzey + kenar. */
export const buildElevation = (colors, isDark) => ({
  e0: { backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default },
  e1: isDark
    ? { backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default }
    : {
        backgroundColor: colors.bg.surface,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        ...shadow(2, 8, 0.06, 2),
      },
  e2: isDark
    ? { backgroundColor: colors.bg.raised, borderWidth: 1, borderColor: colors.border.strong }
    : { backgroundColor: colors.bg.raised, ...shadow(4, 16, 0.1, 6) },
  e3: { backgroundColor: colors.bg.raised, ...shadow(12, 32, 0.14, 12) },
  e4: { backgroundColor: colors.bg.inverse, ...shadow(8, 24, 0.18, 8) },
});
