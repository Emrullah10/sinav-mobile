import axios from 'axios';
import { API_BASE_URL, APP_VERSION, PLATFORM, REQUEST_TIMEOUT_MS } from '@shared/constant/config';
import { authState } from '@shared/auth/authStore';
import {
  clearTokens,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@shared/auth/tokenStorage';
import { SESSION_ENDED_CODES, apiErrorCode } from '@shared/vendor/client-sdk/index.js';
import { getDeviceId } from './deviceId';

// Kendi interceptor'ı olmayan çıplak örnek: yenileme çağrısı asla yenilemeyi tetikleyemez (döngü yok).
const bare = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

let refreshInFlight = null;

export class SessionEndedError extends Error {
  constructor(code) {
    super(code);
    this.name = 'SessionEndedError';
    this.code = code;
  }
}

/** Oturumu bitir: token'ları sil, durumu 'unauthenticated' yap (SYS-07 tetiklenir). */
export const endSession = async (code = 'SESSION_GONE') => {
  await clearTokens();
  authState().setUnauthenticated(code);
};

const doRefresh = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new SessionEndedError('REFRESH_MISSING');
  try {
    const res = await bare.post(
      '/api/gateway/refresh',
      { refreshToken },
      {
        headers: {
          'X-Auth-Transport': 'bearer',
          'X-Client': `sinav-mobile/${APP_VERSION}`,
          'X-Device-Id': await getDeviceId(),
          'X-Platform': PLATFORM,
        },
      },
    );
    const auth = res.data?.data?.auth;
    if (!auth?.accessToken || !auth?.refreshToken) throw new SessionEndedError('RT_INVALID');
    setAccessToken(auth.accessToken);
    await setRefreshToken(auth.refreshToken); // rotasyon
    return auth;
  } catch (err) {
    if (err instanceof SessionEndedError) throw err;
    const code = apiErrorCode(err);
    const status = err.response?.status;
    // Yanıt var ve oturumu reddediyor → bitti. Ağ/zaman aşımı/5xx → geçici: oturum korunur.
    if (SESSION_ENDED_CODES.includes(code) || status === 401 || status === 400 || status === 403) {
      throw new SessionEndedError(SESSION_ENDED_CODES.includes(code) ? code : 'RT_INVALID');
    }
    throw err;
  }
};

/** Tek uçuşlu yenileme: eşzamanlı 401'ler aynı sözü bekler. */
export const refreshSession = () => {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};
