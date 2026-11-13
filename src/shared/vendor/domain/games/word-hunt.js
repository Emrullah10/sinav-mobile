// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// SAF modül (node bağımlılığı yok): Kelime Avı kuralları. Izgara size×size, komşu (8 yön) harflerden yol çizerek kelime kurulur.
export const WORD_HUNT_SIZE = 4;
export const WORD_HUNT_MIN_LEN = 3;
export const WORD_HUNT_DURATION_MS = 90_000; // oyun süresi
export const WORD_HUNT_LEAD_MS = 4_000; // başlamadan önceki geri sayım
export const WORD_HUNT_GRACE_MS = 2_500; // ağ gecikmesi payı (yalnız sunucu)

/** i hücresinin komşuları (8 yön). */
export const huntNeighbors = (i, size = WORD_HUNT_SIZE) => {
  const r = Math.floor(i / size);
  const c = i % size;
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) out.push(rr * size + cc);
    }
  }
  return out;
};

/** Yol geçerli mi: tam sayı indeksler, tekrarsız, ardışık hücreler komşu. */
export const isHuntPathValid = (path, size = WORD_HUNT_SIZE) => {
  if (!Array.isArray(path) || path.length < 1 || path.length > size * size) return false;
  const seen = new Set();
  for (let k = 0; k < path.length; k += 1) {
    const i = path[k];
    if (!Number.isInteger(i) || i < 0 || i >= size * size || seen.has(i)) return false;
    if (k > 0 && !huntNeighbors(path[k - 1], size).includes(i)) return false;
    seen.add(i);
  }
  return true;
};

export const huntPathWord = (grid, path) => path.map((i) => grid[i]).join('');

/** Kelime başına puan (uzunluğa göre). */
export const huntWordPoints = (len) => (len <= 4 ? 1 : len === 5 ? 2 : len === 6 ? 3 : len === 7 ? 5 : 11);

/** Izgarada kelimeyi kuran bir yol bul (klavyeyle yazma için). Yoksa null. */
export const findHuntPath = (grid, word, size = WORD_HUNT_SIZE) => {
  const w = String(word).toLowerCase();
  const walk = (path) => {
    if (path.length === w.length) return path;
    const next = path.length ? huntNeighbors(path[path.length - 1], size) : grid.map((_, i) => i);
    for (const i of next) {
      if (path.includes(i) || grid[i] !== w[path.length]) continue;
      const r = walk([...path, i]);
      if (r) return r;
    }
    return null;
  };
  return w ? walk([]) : null;
};
