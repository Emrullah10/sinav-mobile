import { Platform } from 'react-native';
import { tokens } from '@shared/vendor/design-tokens/tokens.js';

// Yüklenen font dosyaları (bkz. fonts.js). Ağırlık → PostScript benzeri aile adı.
const FILES = {
  ui: {
    400: 'Figtree_400Regular',
    500: 'Figtree_500Medium',
    600: 'Figtree_600SemiBold',
    700: 'Figtree_700Bold',
  },
  reading: {
    400: 'Literata_400Regular',
    500: 'Literata_500Medium',
    600: 'Literata_600SemiBold',
    '400i': 'Literata_400Regular_Italic',
  },
  brand: { 600: 'BricolageGrotesque_600SemiBold', 700: 'BricolageGrotesque_700Bold' },
  mono: {
    400: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    500: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
};

const nearest = (map, weight) => {
  const keys = Object.keys(map)
    .filter((k) => /^\d+$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);
  const pick = keys.reduce(
    (best, k) => (Math.abs(k - weight) < Math.abs(best - weight) ? k : best),
    keys[0],
  );
  return map[pick];
};

/** family: 'ui' | 'reading' | 'brand' | 'mono'. Özel yazı tipi dosyası ağırlığa göre seçilir (fontWeight verilmez). */
export const fontFamilyFor = (family, weight = 400, italic = false) => {
  const map = FILES[family] || FILES.ui;
  if (italic && map['400i']) return map['400i'];
  return nearest(map, weight);
};

const TNUM = new Set(['numeric-l', 'numeric-m']);

/** Token tip ölçeğinden mobil (indeks 0) boyutlarla stil nesneleri üretir. */
export const buildTypeScale = () => {
  const out = {};
  for (const [name, t] of Object.entries(tokens.type)) {
    const size = t.size[0];
    out[name] = {
      fontFamily: fontFamilyFor(t.family, t.weight),
      fontSize: size,
      lineHeight: t.line[0],
      letterSpacing: Math.round(t.tracking * size * 100) / 100,
      family: t.family,
      weight: t.weight,
      ...(name === 'overline' ? { textTransform: 'uppercase' } : null),
      ...(TNUM.has(name) ? { fontVariant: ['tabular-nums'] } : null),
    };
  }
  return out;
};

export const typeScale = buildTypeScale();
export const READING_VARIANTS = ['reading-l', 'reading-m', 'reading-s'];
