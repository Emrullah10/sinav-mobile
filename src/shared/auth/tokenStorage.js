import * as SecureStore from 'expo-secure-store';

// Access token yalnız bellekte; refresh token secure-store'da (PLAN-P0 §5.6).
const REFRESH_KEY = 'sinav.refreshToken';
const OPTS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

let accessToken = null;
let refreshCache; // undefined = henüz okunmadı

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getRefreshToken = async () => {
  if (refreshCache !== undefined) return refreshCache;
  try {
    refreshCache = (await SecureStore.getItemAsync(REFRESH_KEY, OPTS)) || null;
  } catch {
    refreshCache = null;
  }
  return refreshCache;
};

export const setRefreshToken = async (token) => {
  refreshCache = token || null;
  try {
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token, OPTS);
    else await SecureStore.deleteItemAsync(REFRESH_KEY, OPTS);
  } catch {
    /* secure-store kullanılamıyorsa oturum yalnız bu çalıştırma boyunca sürer */
  }
};

export const clearTokens = async () => {
  accessToken = null;
  await setRefreshToken(null);
};
