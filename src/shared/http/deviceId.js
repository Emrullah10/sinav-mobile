import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'sinav.deviceId';
let cached = null;
let pending = null;

/** Kurulum başına kalıcı uuid (X-Device-Id). */
export const getDeviceId = () => {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = (async () => {
      try {
        let id = await SecureStore.getItemAsync(KEY);
        if (!id) {
          id = Crypto.randomUUID();
          await SecureStore.setItemAsync(KEY, id);
        }
        cached = id;
      } catch {
        cached = Crypto.randomUUID();
      }
      return cached;
    })();
  }
  return pending;
};
