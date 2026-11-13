// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// SAF modül: Anlam Yakınlığı gösterim kuralları. rank 1 = gizli kelimenin kendisi; küçük sıra = yakın.
export const CLOSENESS_MAX_HINTS = 3;
export const CLOSENESS_MAX_GUESSES = 200;

/** Sıradan sıcaklık: hot (≤10), warm (≤100), mild (≤1000), cold. */
export const closenessTone = (rank) => (rank <= 1 ? 'found' : rank <= 10 ? 'hot' : rank <= 100 ? 'warm' : rank <= 1000 ? 'mild' : 'cold');

/** Çubuk doluluğu 0–1: logaritmik ölçek (1. sıra tam dolu, son sıra boşa yakın). */
export const closenessFill = (rank, size) => {
  if (rank <= 1) return 1;
  return Math.max(0.03, 1 - Math.log10(rank) / Math.log10(Math.max(size, 10)));
};

export const scoreCloseness = ({ won, guesses, hints }) => (won ? Math.max(100, 1000 - 25 * Math.max(0, guesses - 1) - 150 * hints) : 0);

/** İstatistik dağılımı için kova: kaçıncı tahminde bulundu. */
export const closenessBucket = (guesses) => (guesses <= 5 ? 'b5' : guesses <= 10 ? 'b10' : guesses <= 20 ? 'b20' : guesses <= 40 ? 'b40' : 'b41');
