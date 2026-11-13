import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@api';
import { report } from '@shared/monitoring/report';
import { ensureNotificationPermission } from './reminders';

/**
 * Expo push token'ını sunucuya kaydeder (sıra geldi / davet bildirimleri için).
 * `ask: false` iken izin zaten verilmişse çalışır, izin penceresi açmaz. Simülatörde ve EAS projectId yokken sessizce çıkar.
 */
export const registerPushToken = async ({ ask = false, locale } = {}) => {
  try {
    if (!Device.isDevice) return false;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return false;
    const granted = ask ? await ensureNotificationPermission() : (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return false;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.identityDeviceRegister({
      platform: Platform.OS === 'ios' ? 'ios' : 'android', tokenProvider: 'expo', pushToken: data,
      appVersion: Constants.expoConfig?.version, deviceName: Device.deviceName || undefined, locale, permissionGranted: true,
    });
    return true;
  } catch (e) {
    report(e, { where: 'push.register' });
    return false;
  }
};
