// Legacy Turkish route paths (before 2026-11-06) → current English paths. Old builds, scheduled reminders and
// shared links may still carry them; +native-intent.js and openDeepLink() run every incoming path through this.
const ROOT = {
  giris: 'sign-in',
  kayit: 'sign-up',
  karsilama: 'welcome',
  'oturum-bitti': 'session-ended',
  'sifre-sifirla': 'reset-password',
  kelimeler: 'vocabulary',
  not: 'note',
  ogretmen: 'tutor',
  oku: 'read',
  'seviye-tespiti': 'diagnostic',
  sinav: 'exam-session',
  soru: 'question',
  baslangic: 'onboarding',
  musaitlik: 'availability',
  'plan-onizleme': 'plan-preview',
  ben: 'me',
  bugun: 'today',
  calis: 'study',
  deneme: 'exams',
  destek: 'support',
  'geri-bildirim': 'feedback',
  yardim: 'help',
  yasal: 'legal',
};
const SUB = {
  me: {
    'arka-plan': 'background',
    ayarlar: 'settings',
    hedef: 'goal',
    hesap: 'account',
    ilerleme: 'progress',
  },
  study: {
    beceri: 'skill',
    hatalar: 'mistakes',
    kelimeler: 'vocabulary',
    kitaplik: 'library',
    tip: 'type',
    'yer-imleri': 'bookmarks',
  },
  tutor: { ceviri: 'translation' },
};
const TAIL = { sonuc: 'result', inceleme: 'review', tekrar: 'review', tamam: 'done' };

/** '/bugun' → '/today', '/deneme/12/sonuc?x=1' → '/exams/12/result?x=1'. Unknown paths are returned unchanged. */
export const mapLegacyPath = (input) => {
  if (typeof input !== 'string') return input;
  const m = /^([a-z][a-z0-9+.-]*:\/\/)?(\/?)([^?#]*)(.*)$/i.exec(input);
  if (!m) return input;
  const [, scheme = '', slash, body, rest] = m;
  const segs = body.split('/');
  const root = ROOT[segs[0]];
  if (!root) return input;
  const out = [root, ...segs.slice(1).map((s, i) => (i === 0 && SUB[root]?.[s]) || TAIL[s] || s)];
  return `${scheme}${slash}${out.join('/')}${rest}`;
};
