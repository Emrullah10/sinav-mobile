// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// SAF modül (node bağımlılığı yok): seviye yolu kuralları. Sunucu seviye üretir/yıldız verir; web ve mobil hedef şeridini aynı koddan çizer.
// Oyun başına 60 seviye = 6 bölüm × 10. Seviye içeriği "oyun:seviye" tohumundan üretilir (herkese aynı).

export const LEVELS_PER_GAME = 60;
export const LEVELS_PER_SECTION = 10;
export const LEVEL_SECTIONS = LEVELS_PER_GAME / LEVELS_PER_SECTION;
export const XP_PER_STAR = 10;
export const XP_DAILY_WIN = 20;
export const XP_MATCH_WIN = 30;
export const XP_MATCH_LOSS = 10;

export const isLevelValid = (n) => Number.isInteger(n) && n >= 1 && n <= LEVELS_PER_GAME;
export const sectionOf = (level) => Math.floor((level - 1) / LEVELS_PER_SECTION); // 0..5
export const levelInSection = (level) => ((level - 1) % LEVELS_PER_SECTION) + 1; // 1..10

/**
 * Seviyenin sabit parametreleri (tabloda tutulmaz). Hedef puanlar bulmacadan hesaplanır → sunucu `spec.target` ekler.
 * `pct`: Kelime Avı'nda hedef, ızgaradaki toplam olası puanın yüzdesi. `from/to`: kelime havuzunda sıklık aralığı (yaygından seyrek).
 */
export const levelParams = (game, level) => {
  const s = sectionOf(level);
  const t = (levelInSection(level) - 1) / (LEVELS_PER_SECTION - 1); // bölüm içi ilerleme 0..1
  switch (game) {
    case 'letter_guess':
      return [
        { length: 4, pool: 'common', from: 0, to: 1500, maxTries: 6 },
        { length: 5, pool: 'common', from: 0, to: 2000, maxTries: 6 },
        { length: 5, pool: 'common', from: 2000, to: 6000, maxTries: 6 },
        { length: 5, pool: 'targets', from: 0, to: null, maxTries: 6 },
        { length: 6, pool: 'common', from: 0, to: 3000, maxTries: 6 },
        { length: 6, pool: 'common', from: 3000, to: null, maxTries: 5 },
      ][s];
    case 'word_hunt':
      return { size: s < 3 ? 4 : 5, durationMs: s === 5 ? 75_000 : 90_000, pct: Math.round((0.05 + s * 0.015 + t * 0.01) * 1000) / 1000 };
    case 'closeness':
      return { maxHints: [3, 3, 2, 2, 1, 1][s], band: s, bands: LEVEL_SECTIONS };
    case 'word_board':
      return { maxMoves: s >= 4 ? 8 : 10, target: Math.round((45 + level * 2.5) / 5) * 5 };
    default:
      return null;
  }
};

/**
 * Yıldız kuralı (istemci hedef şeridi için de): metric 'tries' → o sayıda ya da daha az denemede; 'score' → o puana ya da üstüne.
 * thresholds = [1★, 2★, 3★].
 */
export const levelStarRules = (game, spec) => {
  if (game === 'letter_guess') return { metric: 'tries', thresholds: [spec.maxTries, 4, 3] };
  if (game === 'closeness') return { metric: 'tries', thresholds: [null, 25, 12] };
  if (game === 'word_hunt') return { metric: 'score', thresholds: [spec.target, Math.round(spec.target * 1.5), spec.target * 2] };
  if (game === 'word_board') return { metric: 'score', thresholds: [spec.target, Math.round(spec.target * 1.3), Math.round(spec.target * 1.6)] };
  return { metric: 'score', thresholds: [1, 2, 3] };
};

/** Yıldız (0–3). result = { won, tries, score, hinted? }. */
export const starsFor = (game, spec, result) => {
  const { metric, thresholds } = levelStarRules(game, spec);
  if (metric === 'tries') {
    if (!result.won) return 0;
    if (result.tries <= thresholds[2]) return result.hinted ? 2 : 3; // ipucu kullanılan seviyede 3★ olmaz
    if (result.tries <= thresholds[1]) return 2;
    return 1;
  }
  if (result.score >= thresholds[2]) return 3;
  if (result.score >= thresholds[1]) return 2;
  if (result.score >= thresholds[0]) return 1;
  return 0;
};

/** Oyuncu seviyesi XP'den türetilir: seviye L, 25·L·(L−1) XP'de başlar (1→0, 2→50, 3→150, 4→300…). */
export const playerLevel = (xp) => {
  const x = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  while (25 * (level + 1) * level <= x) level += 1;
  const base = 25 * level * (level - 1);
  const next = 25 * (level + 1) * level;
  return { level, xp: x, base, next, progress: (x - base) / (next - base) };
};
