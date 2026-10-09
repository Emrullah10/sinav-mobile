import { http } from '@shared/http/client';
import { createApi } from '@shared/vendor/client-sdk/index.js';

/** Servis uç fonksiyonları (axios yanıtı döner; gövde { success, data }). Sync sonrası yeni modüller kendiliğinden gelir. */
export const api = createApi(http);
export { http };
export default api;
