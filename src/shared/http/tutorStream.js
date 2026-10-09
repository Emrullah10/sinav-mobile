import { fetch as streamingFetch } from 'expo/fetch';
import { API_BASE_URL, APP_VERSION, PLATFORM } from '@shared/constant/config';
import { getAccessToken } from '@shared/auth/tokenStorage';
import { getDeviceId } from './deviceId';
import { refreshSession } from './refresh';
import { streamSse } from './sseStream';

const PATH = '/api/sinav-service-tutor/v1';

const buildHeaders = async (token) => ({
  'X-Auth-Transport': 'bearer',
  'X-Client': `sinav-mobile/${APP_VERSION}`,
  'X-Platform': PLATFORM,
  'X-Device-Id': await getDeviceId(),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/**
 * Öğretmen mesajı gönderir ve SSE akışını okur (RN uyumlu: `expo/fetch` akış gövdesi verir).
 * Erişim token'ı süresi dolmuşsa bir kez yenileyip yeniden dener (akış başlamadan önce 401 JSON döner).
 * opts: { signal, onEvent({event,data}) }. Hata: error.status / error.code.
 */
export const sendTutorMessage = async (conversationCode, body, { signal, onEvent } = {}) => {
  const run = async (token) =>
    streamSse({
      fetchFn: streamingFetch,
      url: `${API_BASE_URL}${PATH}/conversations/${conversationCode}/messages`,
      headers: await buildHeaders(token),
      body,
      signal,
      onEvent,
    });
  try {
    return await run(getAccessToken());
  } catch (err) {
    if (err.status === 401 && ['TOKEN_EXPIRED', 'TOKEN_MISSING'].includes(err.code)) {
      const auth = await refreshSession();
      return run(auth.accessToken);
    }
    throw err;
  }
};
