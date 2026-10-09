import { router } from 'expo-router';
import { useState } from 'react';
import { AuthShell, Banner, Button, TextField, Text } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { useCooldown } from '@hooks/useCooldown';
import { useT } from '@shared/translation/useT';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPassword() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
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

  const request = () => {
    setFieldError({});
    if (!EMAIL_RE.test(email.trim())) return setFieldError({ email: t('auth.emailInvalid') });
    run(async () => {
      const res = await api.identityAuthPasswordResetRequest({ email: email.trim() });
      setSent(true);
      cooldown.start(unwrap(res)?.retryAfterSeconds ?? 45);
    });
  };

  const confirm = () => {
    setFieldError({});
    const clean = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean)) return setFieldError({ code: t('auth.codeFormat') });
    if (password.length < 8) return setFieldError({ password: t('auth.passwordShort') });
    run(async () => {
      await api.identityAuthPasswordResetConfirm({
        email: email.trim(),
        code: clean,
        newPassword: password,
      });
      setDone(true);
    });
  };

  if (done) {
    return (
      <AuthShell title={t('auth.reset.title')}>
        <Banner tone="success" message={t('auth.reset.done')} />
        <Button title={t('auth.signIn.title')} onPress={() => router.replace('/giris')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')}>
      {error ? <Banner tone="danger" message={error} /> : null}
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={fieldError.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!sent}
      />
      {sent ? (
        <>
          <Text variant="body-m" color="secondary">
            {t('auth.codeSent', { email: email.trim() })}
          </Text>
          <TextField
            label={t('auth.code')}
            value={code}
            onChangeText={setCode}
            error={fieldError.code}
            keyboardType="number-pad"
            maxLength={7}
            textContentType="oneTimeCode"
          />
          <TextField
            label={t('auth.reset.newPassword')}
            value={password}
            onChangeText={setPassword}
            error={fieldError.password}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <Button title={t('auth.reset.submit')} onPress={confirm} loading={busy} />
          <Button
            title={cooldown.left > 0 ? t('auth.resendIn', { s: cooldown.left }) : t('auth.resend')}
            variant="tertiary"
            size="md"
            disabled={cooldown.left > 0}
            onPress={request}
          />
        </>
      ) : (
        <Button title={t('auth.sendCode')} onPress={request} loading={busy} />
      )}
    </AuthShell>
  );
}
