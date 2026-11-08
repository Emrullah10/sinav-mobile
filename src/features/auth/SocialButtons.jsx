import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { Text } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const extra = Constants.expoConfig?.extra || {};
let configured = false;
const configureGoogle = () => {
  if (configured) return;
  GoogleSignin.configure({ webClientId: extra.googleWebClientId, iosClientId: extra.googleIosClientId, scopes: ['email', 'profile'] });
  configured = true;
};

// Marka logoları: resmi renkler marka kuralı gereği sabittir (tema rengi uygulanmaz).
const APPLE_PATH = 'M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.6 3c.7-.9 1.2-2 1-3.2-1 .1-2.2.7-3 1.6-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.5z';
const AppleLogo = ({ color }) => (
  <Svg width={20} height={22} viewBox="0 0 17 20"><Path d={APPLE_PATH} fill={color} /></Svg>
);
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
    <Path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z" />
    <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </Svg>
);

/** Yalnız logolu yuvarlak düğme (Apple ve Google aynı görünüm). */
function LogoButton({ label, onPress, disabled, children }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.border.strong,
        backgroundColor: pressed ? colors.bg.pressed : colors.bg.surface, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * Apple (yalnız iOS, yerel düğme) + Google ile devam. Sunucuda kapalı sağlayıcının düğmesi çıkmaz.
 * onToken({ provider, idToken, nonce, name }) — kimlik jetonu sunucuda doğrulanır.
 */
export function SocialButtons({ onToken, onError, disabled = false, mode = 'signin' }) {
  const { t } = useT();
  const { colors } = useTheme();
  const [appleOk, setAppleOk] = useState(false);
  const cfg = useQuery({
    queryKey: ['identity', 'auth-providers'],
    queryFn: async () => unwrap(await api.identityAuthProviders()) || {},
    staleTime: 60 * 60 * 1000,
  });
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleOk).catch(() => setAppleOk(false));
  }, []);
  const showApple = appleOk && Boolean(cfg.data?.apple);
  const showGoogle = Boolean(cfg.data?.google) && Boolean(extra.googleWebClientId);

  const apple = async () => {
    try {
      const nonce = Crypto.randomUUID();
      const r = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce,
      });
      const name = [r.fullName?.givenName, r.fullName?.familyName].filter(Boolean).join(' ') || null;
      if (r.identityToken) onToken({ provider: 'apple', idToken: r.identityToken, nonce, name });
    } catch (e) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') throw e;
    }
  };

  const google = async () => {
    configureGoogle();
    try {
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const r = await GoogleSignin.signIn();
      if (r?.type !== 'success' || !r.data?.idToken) return;
      const { idToken, user } = r.data;
      // Bir sonraki girişte hesap seçici yeniden çıksın; jeton zaten alındı.
      GoogleSignin.signOut().catch(() => {});
      onToken({ provider: 'google', idToken, name: user?.name || null });
    } catch (e) {
      if (isErrorWithCode(e) && [statusCodes.SIGN_IN_CANCELLED, statusCodes.IN_PROGRESS].includes(e.code)) return;
      throw e;
    }
  };

  if (!showApple && !showGoogle) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
        <Text variant="caption" color="tertiary">{t('auth.social.or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        {showApple ? (
          <LogoButton label={t(mode === 'signup' ? 'auth.social.appleSignUp' : 'auth.social.apple')} disabled={disabled} onPress={() => apple().catch((e) => onError?.(e))}>
            <AppleLogo color={colors.text.primary} />
          </LogoButton>
        ) : null}
        {showGoogle ? (
          <LogoButton label={t(mode === 'signup' ? 'auth.social.googleSignUp' : 'auth.social.google')} disabled={disabled} onPress={() => google().catch((e) => onError?.(e))}>
            <GoogleLogo />
          </LogoButton>
        ) : null}
      </View>
    </View>
  );
}
