import { api } from '@api';
import { BOOTSTRAP_TIMEOUT_MS } from '@shared/constant/config';
import { SessionEndedError, endSession, refreshSession } from '@shared/http/refresh';
import { authState } from './authStore';
import { getRefreshToken, setAccessToken, setRefreshToken } from './tokenStorage';

/**
 * Kimlik uçlarının (guest/register/verify/login/switch) yanıtını uygular:
 * data = { user, auth: { accessToken, refreshToken, … }, permissions? }.
 */
export const applyAuthResponse = async (data) => {
  const { auth, user } = data || {};
  if (!auth?.accessToken || !auth?.refreshToken)
    throw new Error('applyAuthResponse: auth alanı yok');
  setAccessToken(auth.accessToken);
  await setRefreshToken(auth.refreshToken);
  authState().setAuthenticated({ user, permissions: data.permissions || user?.permissions });
  return user;
};

/** GET /me → store. Kullanıcı özeti /me'de minimaldir (rol, organizasyon); izinler tam gelir. */
export const loadMe = async () => {
  const res = await api.gatewayMe();
  const { user, permissions, organization } = res.data?.data || {};
  authState().setAuthenticated({ user: { ...user, organization }, permissions });
  return user;
};

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), ms),
    ),
  ]);

const resumeFromRefresh = async () => {
  await refreshSession();
  return loadMe();
};

let bootstrapPromise = null;

/** Açılış: secure-store'da refresh varsa /refresh → /me; yoksa 'unauthenticated'. En çok 8 sn. */
export const bootstrapSession = () => {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        if (!(await getRefreshToken())) return authState().setUnauthenticated();
        await withTimeout(resumeFromRefresh(), BOOTSTRAP_TIMEOUT_MS);
      } catch (err) {
        // Oturum reddedildiyse refresh.js zaten temizledi; ağ/zaman aşımında token korunur, durum belirlenir.
        if (err instanceof SessionEndedError)
          await endSession(err.code === 'REFRESH_MISSING' ? null : err.code);
        else if (authState().status === 'unknown') authState().setUnauthenticated();
      } finally {
        bootstrapPromise = null;
      }
    })();
  }
  return bootstrapPromise;
};

let ensuring = null;

/**
 * Oturum yoksa misafir oturumu açar (identityAuthGuest). Varsa (ya da refresh token ile sürdürülebiliyorsa)
 * mevcut kullanıcıyı döndürür. Eşzamanlı çağrılar tek uçuşludur.
 */
export const ensureSession = () => {
  if (authState().status === 'authenticated') return Promise.resolve(authState().user);
  if (!ensuring) {
    ensuring = (async () => {
      if (await getRefreshToken()) {
        try {
          return await resumeFromRefresh();
        } catch (err) {
          if (!(err instanceof SessionEndedError)) throw err; // geçici hata: misafir açıp oturumu yetim bırakma
        }
      }
      const res = await api.identityAuthGuest({});
      return applyAuthResponse(res.data?.data);
    })().finally(() => {
      ensuring = null;
    });
  }
  return ensuring;
};

/** Çıkış: sunucuda iptal (en iyi çaba) + yerel temizlik. */
export const signOut = async () => {
  try {
    await api.gatewayLogout({ refreshToken: await getRefreshToken() }, { skipAuthRefresh: true });
  } catch {
    /* sunucu erişilemese de yerel oturum kapanır */
  }
  await endSession(null);
};
