// Expo yapılandırması. APP_VARIANT=production dışındaki her profil "dev" sayılır:
// yerel ağ / cleartext izinleri yalnız dev'de açılır (PLAN-P0 §5.10).
const pkg = require('./package.json');

const isProd =
  process.env.APP_VARIANT === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

// EAS: `eas init` projectId'yi üretir; EAS_PROJECT_ID/EXPO_OWNER ile (eas.json env) ya da buraya yazılır.
const projectId = process.env.EAS_PROJECT_ID;
// Sentry kaynak haritası yüklemesi yalnız organizasyon/proje verilmişse (derleme ortamında) etkinleşir.
const sentry = process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? [['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]]
  : [];

module.exports = () => ({
  expo: {
    name: 'ODAK',
    slug: 'sinav',
    scheme: 'sinav',
    version: pkg.version,
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F4F6F5',
    },
    ios: {
      bundleIdentifier: 'com.sinav.odak',
      supportsTablet: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        ...(isProd ? {} : { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }),
      },
    },
    android: {
      package: 'com.sinav.odak',
      permissions: ['POST_NOTIFICATIONS'],
      // Mikrofon ve kamera yalnız geri bildirimde (sesli anlatım, fotoğraf) kullanıcı istediğinde açılır.
      blockedPermissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      adaptiveIcon: {
        backgroundColor: '#0E6A6E',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    plugins: [
      './plugins/with-ios-scene-lifecycle',
      'expo-router',
      ['expo-secure-store', { faceIDPermission: false }],
      ['expo-localization', { supportedLocales: { ios: ['tr', 'en'], android: ['tr', 'en'] } }],
      'expo-font',
      'expo-web-browser',
      ['expo-notifications', { color: '#0E6A6E' }],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 168,
          backgroundColor: '#F4F6F5',
          dark: { image: './assets/splash-icon-dark.png', backgroundColor: '#0E171B' },
        },
      ],
      [
        'expo-audio',
        { microphonePermission: 'Hata ya da önerini sesli anlatmak istediğinde mikrofon kullanılır. Kayıt yalnız sen gönderirsen bize ulaşır.' },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Hata ya da önerine fotoğraf eklemek istediğinde galerine erişilir.',
          cameraPermission: 'Hata ya da önerine fotoğraf çekip eklemek istediğinde kamera kullanılır.',
          microphonePermission: false,
        },
      ],
      ['expo-build-properties', { android: { usesCleartextTraffic: !isProd } }],
      ...sentry,
    ],
    experiments: { typedRoutes: false },
    extra: {
      appVariant: isProd ? 'production' : 'development',
      ...(projectId ? { eas: { projectId } } : {}),
    },
  },
});
