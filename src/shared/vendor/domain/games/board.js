// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// SAF modül (node bağımlılığı yok): Harf Tahtası kuralları — 11×11 özgün tahta, kendi harf değerleri ve ödül kareleri.
export const BOARD_SIZE = 11;
export const BOARD_CENTER = 5 * BOARD_SIZE + 5;
export const RACK_SIZE = 7;
export const BOARD_MAX_MOVES = 10;
export const BOARD_FULL_RACK_BONUS = 25;
export const BOARD_EMPTY = '.';

// Harf değerleri (sıklığa göre; yaygın harf az, nadir harf çok puan).
export const BOARD_LETTER_VALUES = Object.freeze({
  e: 1, a: 1, i: 1, o: 1, n: 1, r: 1, t: 1, l: 1, s: 1, u: 1,
  d: 2, g: 2, h: 2, m: 2, c: 2, p: 2, b: 2,
  f: 3, y: 3, w: 3, k: 3, v: 3,
  j: 5, x: 5, q: 7, z: 7,
});

// Torba içeriği (100 taş, joker yok).
export const BOARD_BAG = Object.freeze({
  e: 11, a: 9, i: 8, o: 8, n: 6, r: 6, t: 6, l: 4, s: 4, u: 4, d: 4, g: 3, h: 3, m: 3, c: 3, p: 3,
  b: 2, f: 2, y: 2, w: 2, v: 2, k: 1, j: 1, x: 1, q: 1, z: 1,
});

// Ödül kareleri: bir çeyrek (satır, sütun ≤ 5) tanımlanır, yatay/dikey yansıtılır.
const QUARTER = {
  tw: [[0, 4], [4, 0]], // kelime ×3
  dw: [[1, 5], [5, 1], [3, 3], [5, 5]], // kelime ×2 (merkez dahil)
  tl: [[0, 0], [2, 2], [1, 3], [3, 1]], // harf ×3
  dl: [[0, 2], [2, 0], [4, 4], [2, 5], [5, 2], [4, 1], [1, 4]], // harf ×2
};
const PREMIUM = (() => {
  const map = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  for (const [kind, cells] of Object.entries(QUARTER)) {
    for (const [r, c] of cells) {
      for (const rr of [r, 10 - r]) for (const cc of [c, 10 - c]) map[rr * BOARD_SIZE + cc] = kind;
    }
  }
  return Object.freeze(map);
})();
export const boardPremium = (i) => PREMIUM[i];
export const boardPremiumMap = () => PREMIUM;

export const boardIndex = (r, c) => r * BOARD_SIZE + c;
export const emptyBoard = () => BOARD_EMPTY.repeat(BOARD_SIZE * BOARD_SIZE);

/** Torba harfleri (karıştırılmamış, a-z sırasıyla). */
export const bagLetters = () => Object.entries(BOARD_BAG).flatMap(([l, n]) => Array(n).fill(l));

const inRange = (r, c) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE;

/**
 * Hamle değerlendirme. board: 121 karakter ('.' boş). placements: [{ r, c, l }].
 * isWord verilirse sözlük de denetlenir. Dönüş: { ok:true, score, words:[{word,cells,score}], fullRack } | { ok:false, code, word? }.
 * Hata kodları: PLACEMENT_EMPTY, PLACEMENT_OFF_BOARD, PLACEMENT_OCCUPIED, PLACEMENT_NOT_LINE, PLACEMENT_GAP, PLACEMENT_NOT_CENTER, PLACEMENT_NOT_CONNECTED, WORD_NOT_IN_LIST.
 */
export const evaluateBoardMove = (board, placements, isWord) => {
  if (!Array.isArray(placements) || placements.length === 0) return { ok: false, code: 'PLACEMENT_EMPTY' };
  const cells = new Map();
  for (const p of placements) {
    if (!inRange(p.r, p.c) || !/^[a-z]$/.test(p.l || '')) return { ok: false, code: 'PLACEMENT_OFF_BOARD' };
    const i = boardIndex(p.r, p.c);
    if (board[i] !== BOARD_EMPTY || cells.has(i)) return { ok: false, code: 'PLACEMENT_OCCUPIED' };
    cells.set(i, p.l);
  }
  const rows = new Set(placements.map((p) => p.r));
  const cols = new Set(placements.map((p) => p.c));
  const horizontal = rows.size === 1;
  if (!horizontal && cols.size !== 1) return { ok: false, code: 'PLACEMENT_NOT_LINE' };

  const at = (r, c) => (inRange(r, c) ? (cells.get(boardIndex(r, c)) ?? (board[boardIndex(r, c)] !== BOARD_EMPTY ? board[boardIndex(r, c)] : null)) : null);
  // Ana çizgi: yerleştirilenlerin kapsadığı aralıkta boşluk olmamalı.
  const lineCoord = horizontal ? [...cols].sort((a, b) => a - b) : [...rows].sort((a, b) => a - b);
  const fixed = horizontal ? [...rows][0] : [...cols][0];
  const posAt = (k) => (horizontal ? at(fixed, k) : at(k, fixed));
  for (let k = lineCoord[0]; k <= lineCoord[lineCoord.length - 1]; k += 1) if (posAt(k) === null) return { ok: false, code: 'PLACEMENT_GAP' };

  const hasBoard = board.split('').some((ch) => ch !== BOARD_EMPTY);
  if (!hasBoard) {
    if (!cells.has(BOARD_CENTER)) return { ok: false, code: 'PLACEMENT_NOT_CENTER' };
  } else {
    const touches = [...cells.keys()].some((i) => {
      const r = Math.floor(i / BOARD_SIZE);
      const c = i % BOARD_SIZE;
      return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([rr, cc]) => inRange(rr, cc) && board[boardIndex(rr, cc)] !== BOARD_EMPTY);
    });
    if (!touches) return { ok: false, code: 'PLACEMENT_NOT_CONNECTED' };
  }

  // Bir çizgideki kelimeyi (yerleştirme dahil) topla ve puanla.
  const wordAlong = (r, c, dr, dc) => {
    let sr = r;
    let sc = c;
    while (at(sr - dr, sc - dc) !== null) { sr -= dr; sc -= dc; }
    const letters = [];
    const idx = [];
    let rr = sr;
    let cc = sc;
    while (at(rr, cc) !== null) { letters.push(at(rr, cc)); idx.push(boardIndex(rr, cc)); rr += dr; cc += dc; }
    if (letters.length < 2) return null;
    let sum = 0;
    let mult = 1;
    for (let k = 0; k < idx.length; k += 1) {
      const v = BOARD_LETTER_VALUES[letters[k]] || 0;
      const prem = cells.has(idx[k]) ? PREMIUM[idx[k]] : null; // ödül yalnız yeni konan taşta
      sum += prem === 'dl' ? v * 2 : prem === 'tl' ? v * 3 : v;
      if (prem === 'dw') mult *= 2;
      if (prem === 'tw') mult *= 3;
    }
    return { word: letters.join(''), cells: idx, score: sum * mult };
  };

  const words = [];
  const main = horizontal ? wordAlong(fixed, lineCoord[0], 0, 1) : wordAlong(lineCoord[0], fixed, 1, 0);
  if (main) words.push(main);
  for (const p of placements) {
    const cross = horizontal ? wordAlong(p.r, p.c, 1, 0) : wordAlong(p.r, p.c, 0, 1);
    if (cross) words.push(cross);
  }
  if (words.length === 0) return { ok: false, code: 'PLACEMENT_NOT_CONNECTED' }; // tek taş, komşusuz
  if (isWord) for (const w of words) if (!isWord(w.word)) return { ok: false, code: 'WORD_NOT_IN_LIST', word: w.word };
  const fullRack = placements.length >= RACK_SIZE;
  const score = words.reduce((a, w) => a + w.score, 0) + (fullRack ? BOARD_FULL_RACK_BONUS : 0);
  return { ok: true, score, words, fullRack };
};

/** Taşları tahtaya işle. */
export const applyBoardMove = (board, placements) => {
  const arr = board.split('');
  for (const p of placements) arr[boardIndex(p.r, p.c)] = p.l;
  return arr.join('');
};
