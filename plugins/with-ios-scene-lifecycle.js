// iOS 27 UIScene yaşam döngüsü benimsenmemiş uygulamayı açılışta assert ile düşürür.
// Expo SDK 57 ExpoAppSceneDelegate sağlar ama şablon henüz bağlamıyor; burada bağlıyoruz.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE = `
class SceneDelegate: ExpoAppSceneDelegate {}
`;

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('ExpoAppSceneDelegate')) return cfg;

    src = src.replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
    );
    // Window ve React Native başlatma artık scene delegate'te.
    src = src.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\)\n#endif\n/,
      ''
    );
    cfg.modResults.contents = src + SCENE_DELEGATE;
    return cfg;
  });

const withSceneInfoPlist = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

module.exports = (config) => withSceneInfoPlist(withSceneAppDelegate(config));
