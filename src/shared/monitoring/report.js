import * as Sentry from '@sentry/react-native';

/** Hata raporlama (Sentry). DSN yoksa ya da geliştirmede sessizce yok sayılır; ekranlar `.catch(report)` kullanır. */
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let started = false;
export const initMonitoring = () => {
  if (started || !SENTRY_DSN) return;
  started = true;
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    environment: process.env.EXPO_PUBLIC_APP_ENV || 'production',
  });
};

export const report = (error, context) => {
  if (!started || !error) return;
  if (error?.name === 'AbortError') return;
  // Beklenen durumlar (4xx yanıtları, bağlantı yok/zaman aşımı) hata sayılmaz.
  const status = error?.response?.status;
  if (status && status < 500) return;
  if (['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
};

export const wrapRoot = (component) => (started ? Sentry.wrap(component) : component);
