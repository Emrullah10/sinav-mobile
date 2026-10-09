// Expo yapılandırması. APP_VARIANT=production dışındaki her profil "dev" sayılır:
// yerel ağ / cleartext izinleri yalnız dev'de açılır (PLAN-P0 §5.10).
const pkg = require('./package.json');

const isProd =
  process.env.APP_VARIANT === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

module.exports = () => ({
  expo: {
    name: 'ODAK',
    slug: 'sinav',
    scheme: 'sinav',
    version: pkg.version,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0E6A6E',
    },
    ios: {
      bundleIdentifier: 'com.sinav.odak',
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        ...(isProd ? {} : { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }),
      },
    },
    android: {
      package: 'com.sinav.odak',
      adaptiveIcon: {
        backgroundColor: '#0E6A6E',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      'expo-font',
      'expo-web-browser',
      ['expo-notifications', { color: '#0E6A6E' }],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 160,
          backgroundColor: '#F4F6F5',
          dark: { backgroundColor: '#0E171B' },
        },
      ],
      ['expo-build-properties', { android: { usesCleartextTraffic: !isProd } }],
    ],
    experiments: { typedRoutes: false },
    extra: { appVariant: isProd ? 'production' : 'development' },
  },
});
