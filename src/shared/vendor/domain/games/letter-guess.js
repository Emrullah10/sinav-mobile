// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// SAF modül (node bağımlılığı yok): Harf Tahmini kuralları. Sunucu doğrulamada, web ve mobil önizlemede aynı kodu kullanır.
// Durum kodları (harf başına): 'correct' = doğru yerde, 'present' = kelimede var ama yeri yanlış, 'absent' = kelimede yok.

export const LETTER_GUESS_LENGTH = 5;
export const LETTER_GUESS_MAX_TRIES = 6;

const RANK = { absent: 0, present: 1, correct: 2 };

/** Tahminin harf durumlarını hesaplar. Tekrarlanan harfler doğru sayıda işaretlenir (önce doğru yerdekiler). */
export const evaluateGuess = (guess, target) => {
  const g = String(guess).toLowerCase();
  const t = String(target).toLowerCase();
  const result = Array(g.length).fill('absent');
  const left = {};
  for (let i = 0; i < g.length; i += 1) {
    if (g[i] === t[i]) result[i] = 'correct';
    else left[t[i]] = (left[t[i]] || 0) + 1;
  }
  for (let i = 0; i < g.length; i += 1) {
    if (result[i] === 'correct') continue;
    if (left[g[i]] > 0) {
      result[i] = 'present';
      left[g[i]] -= 1;
    }
  }
  return result;
};

/** Klavye renkleri: her harf için bugüne kadarki en iyi durum. rows = [{ letters, marks }]. */
export const keyboardState = (rows) => {
  const out = {};
  for (const { letters, marks } of rows) {
    for (let i = 0; i < letters.length; i += 1) {
      const ch = letters[i];
      if (!(ch in out) || RANK[marks[i]] > RANK[out[ch]]) out[ch] = marks[i];
    }
  }
  return out;
};

/** Puan: kalan denemeye göre 100..600 (ilk denemede 600), kaybedince 0. Günlük sıralamada tek ölçüt. */
export const scoreLetterGuess = ({ won, tries }) => (won ? Math.max(1, LETTER_GUESS_MAX_TRIES + 1 - tries) * 100 : 0);

export const isGuessShapeValid = (guess) => typeof guess === 'string' && /^[a-zA-Z]{5}$/.test(guess);
