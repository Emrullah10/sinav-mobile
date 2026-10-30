import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { report } from '@shared/monitoring/report';

/**
 * RevenueCat (Apple/Google uygulama içi satın alma). Anahtar yoksa (ör. geliştirme) satın alma kapalıdır.
 * RevenueCat kullanıcı kimliği = bizim hesap kodumuz (`user_account_code`); misafir satın alamaz.
 */
const KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
});
export const purchasesEnabled = Boolean(KEY);

let configured = false;
let identified = null;

const ensureConfigured = () => {
  if (!purchasesEnabled) return false;
  if (!configured) {
    Purchases.configure({ apiKey: KEY });
    configured = true;
  }
  return true;
};

export const getPurchases = () => (ensureConfigured() ? Purchases : null);

/** Kayıtlı kullanıcıyı RevenueCat'e tanıtır (aynı kullanıcı için tekrar çağrı etkisizdir). */
export const identifyPurchases = async (code) => {
  if (!ensureConfigured() || !code) return;
  const id = String(code);
  if (identified === id) return;
  await Purchases.logIn(id);
  identified = id;
};

/** Çıkışta RevenueCat kullanıcısını sıfırlar (yeni anonim kimlik). */
export const resetPurchases = async () => {
  if (!configured || !identified) return;
  identified = null;
  try {
    await Purchases.logOut();
  } catch (err) {
    report(err, { where: 'purchases.logOut' });
  }
};

export { Purchases };
