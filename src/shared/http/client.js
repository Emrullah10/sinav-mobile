import axios from 'axios';
import { API_BASE_URL, APP_VERSION, PLATFORM, REQUEST_TIMEOUT_MS } from '@shared/constant/config';
import { authState } from '@shared/auth/authStore';
import { getAccessToken, getRefreshToken } from '@shared/auth/tokenStorage';
import { SESSION_ENDED_CODES, apiErrorCode } from '@shared/vendor/client-sdk/index.js';
import { getDeviceId } from './deviceId';
import { SessionEndedError, endSession, refreshSession } from './refresh';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'X-Auth-Transport': 'bearer',
    'X-Client': `sinav-mobile/${APP_VERSION}`,
    'X-Platform': PLATFORM,
  },
});

http.interceptors.request.use(async (config) => {
  config.headers['X-Device-Id'] = await getDeviceId();
  const token = getAccessToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const REFRESHABLE = ['TOKEN_EXPIRED', 'TOKEN_MISSING'];

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = error.config;
    const code = apiErrorCode(error);
    if (!cfg || !error.response) return Promise.reject(error);

    // Oturum kesin bitti: temizle, SYS-07'yi tetikle, yeniden deneme yok.
    if (SESSION_ENDED_CODES.includes(code)) {
      if (authState().status !== 'unauthenticated') await endSession(code);
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      REFRESHABLE.includes(code) &&
      !cfg._retried &&
      !cfg.skipAuthRefresh
    ) {
      cfg._retried = true; // en fazla bir kez: döngü yok
      // Hiç token'ı olmayan (misafir öncesi) istek: yenilenecek bir şey yok.
      if (!(await getRefreshToken())) {
        if (authState().status === 'authenticated') await endSession('REFRESH_MISSING');
        return Promise.reject(error);
      }
      try {
        const auth = await refreshSession();
        cfg.headers.Authorization = `Bearer ${auth.accessToken}`;
        return http(cfg);
      } catch (refreshError) {
        if (refreshError instanceof SessionEndedError) {
          if (authState().status !== 'unauthenticated') await endSession(refreshError.code);
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default http;
