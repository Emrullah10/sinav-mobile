import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:2000' : 'http://127.0.0.1:2000';

/** Gateway kök adresi (EXPO_PUBLIC_API_BASE_URL; sondaki / atılır). */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE).replace(
  /\/+$/,
  '',
);
export const APP_VERSION = Constants.expoConfig?.version || '0.0.0';
export const PLATFORM = Platform.OS; // 'ios' | 'android'
export const BOOTSTRAP_TIMEOUT_MS = 8000;
export const REQUEST_TIMEOUT_MS = 20000;
