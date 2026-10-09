import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthShell, Banner, Button, TextField, Text } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { ensureSession } from '@shared/auth/session';
import { finishAuth } from '@shared/auth/finishAuth';
import { useCooldown } from '@hooks/useCooldown';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Consent({ label, checked, onChange, legal, required }) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: checked ? colors.accent.default : colors.border.strong,
            backgroundColor: checked ? colors.accent.default : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Check size={16} color={colors.text['on-accent']} /> : null}
        </View>
        <Text variant="body-m" style={{ flex: 1 }}>
          {label}
          {required ? ' *' : ''}
        </Text>
      </Pressable>
      {legal ? (
        <Button
          title={t('auth.consent.read')}
          size="sm"
          variant="tertiary"
          fullWidth={false}
          onPress={() => router.push(`/yasal/${legal}`)}
        />
      ) : null}
    </View>
  );
}

export default function SignUp() {
  const { t } = useT();
  const isGuest = useAuthStore((s) => s.isGuest);
  const status = useAuthStore((s) => s.status);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState({});
  const cooldown = useCooldown();

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () => {
    setFieldError({});
    if (!EMAIL_RE.test(email.trim())) return setFieldError({ email: t('auth.emailInvalid') });
    run(async () => {
      // Kayıt, misafir oturumunu öğrenciye çevirir: oturum yoksa önce misafir aç.
      if (status !== 'authenticated') await ensureSession();
      const res = await api.identityAuthSendCode({ email: email.trim(), purpose: 'signup' });
      setCodeSent(true);
      cooldown.start(unwrap(res)?.retryAfterSeconds ?? 45);
    });
  };

  const register = () => {
    setFieldError({});
    const clean = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean)) return setFieldError({ code: t('auth.codeFormat') });
    if (!kvkk || !terms) return setError(t('auth.consent.required'));
    run(async () => {
      const res = await api.identityAuthRegister({
        email: email.trim(),
        code: clean,
        ...(name.trim() ? { displayName: name.trim() } : {}),
        consents: [
          { type: 'kvkk_notice', granted: true },
          { type: 'terms_of_use', granted: true },
          { type: 'marketing_email', granted: marketing },
        ],
      });
      await finishAuth(unwrap(res));
    });
  };

  return (
    <AuthShell title={t('auth.signUp.title')} subtitle={t('auth.signUp.subtitle')}>
      {error ? <Banner tone="danger" message={error} /> : null}
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={fieldError.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!codeSent}
      />
      {codeSent ? (
        <>
          <Text variant="body-m" color="secondary">
            {t('auth.codeSent', { email: email.trim() })}
          </Text>
          <TextField
            label={t('auth.code')}
            helperText={t('auth.codeHelp')}
            value={code}
            onChangeText={setCode}
            error={fieldError.code}
            keyboardType="number-pad"
            maxLength={7}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <TextField
            label={t('auth.signUp.name')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            maxLength={60}
          />
          <Consent label={t('auth.consent.kvkk')} checked={kvkk} onChange={setKvkk} legal="kvkk_notice" required />
          <Consent label={t('auth.consent.terms')} checked={terms} onChange={setTerms} legal="terms_of_use" required />
          <Consent label={t('auth.consent.marketing')} checked={marketing} onChange={setMarketing} />
          <Button title={t('auth.signUp.submit')} onPress={register} loading={busy} />
          <Button
            title={cooldown.left > 0 ? t('auth.resendIn', { s: cooldown.left }) : t('auth.resend')}
            variant="tertiary"
            size="md"
            disabled={cooldown.left > 0}
            onPress={sendCode}
          />
        </>
      ) : (
        <Button title={t('auth.sendCode')} onPress={sendCode} loading={busy} />
      )}
      {!isGuest || status !== 'authenticated' ? (
        <View style={{ alignItems: 'center' }}>
          <Button
            title={t('auth.signUp.toSignIn')}
            variant="tertiary"
            size="md"
            fullWidth={false}
            onPress={() => router.replace('/giris')}
          />
        </View>
      ) : null}
    </AuthShell>
  );
}
