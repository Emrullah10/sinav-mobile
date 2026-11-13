import { randomUUID } from 'expo-crypto';
import { apiErrorCode } from '@shared/vendor/client-sdk/index.js';

/** Axios yanıtından { success, data } zarfının `data` alanı. */
export const unwrap = (res) => res?.data?.data;

/** İdempotency için istemci anahtarı (UUID v4). */
export const newClientRef = () => randomUUID();

/** Hata -> kullanıcıya gösterilecek çevrilmiş metin. */
export const errorText = (t, err) => {
  const code = apiErrorCode(err);
  if (code && t(`apiErrors.${code}`, { defaultValue: '' })) return t(`apiErrors.${code}`);
  if (!err?.response) return t('state.error.network.body');
  return t('apiErrors.defaultErrorMessage');
};

/** QueryBoundary'nin ErrorState türü. */
export const errorKind = (err) => {
  const status = err?.response?.status;
  if (!err?.response) return 'network';
  if (status === 403 || status === 402) return 'permission';
  if (status === 404) return 'notFound';
  return 'server';
};

export const isCode = (err, ...codes) => codes.includes(apiErrorCode(err));
export { apiErrorCode };

/** Saniye -> "mm:ss" (>=1 saat için "h:mm:ss"). */
export const formatClock = (total) => {
  const s = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** 'YYYY-MM-DD' veya ISO -> yerelleştirilmiş kısa tarih. */
export const formatDate = (value, lang = 'tr', opts = { day: 'numeric', month: 'long' }) => {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', opts);
};

/** Puan: en çok 1 ondalık, dile göre ayraç (tr "57,2", en "57.2"); web ScoreBandCard ile aynı kural. */
export const formatScore = (value, lang = 'tr') => {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return '-';
  return n.toLocaleString(String(lang).startsWith('en') ? 'en-GB' : 'tr-TR', { maximumFractionDigits: 1 });
};

/** Yüzde (0–100 girdi): tr "%75", en "75%". Boş/geçersiz değer "—". */
export const formatPercent = (value, lang = 'tr', digits = 0) => {
  const n = Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) return '—';
  const en = String(lang).startsWith('en');
  const v = n.toLocaleString(en ? 'en-GB' : 'tr-TR', { maximumFractionDigits: digits });
  return en ? `${v}%` : `%${v}`;
};

/** a/b oranı (0–1); payda 0 ya da sonsuz/NaN ise null. */
export const safeRatio = (a, b) => (Number(b) > 0 && Number.isFinite(Number(a) / Number(b)) ? Number(a) / Number(b) : null);

/** Hedef puan: ilerleme uçları düz sayı döndürür (target: 75), bazıları { score }. */
export const targetScoreOf = (target) => (typeof target === 'number' ? target : (target?.score ?? null));

/** Cihazın yerel bugünü 'YYYY-MM-DD' (oturum tarihleriyle dizgi karşılaştırması için). */
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
