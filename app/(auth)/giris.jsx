import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthShell, Banner, Button, Segmented, TextField, Text } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { finishAuth } from '@shared/auth/finishAuth';
import { useCooldown } from '@hooks/useCooldown';
import { useT } from '@shared/translation/useT';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const { t } = useT();
  const [method, setMethod] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState({});
  const cooldown = useCooldown();

  const validEmail = () => {
    if (EMAIL_RE.test(email.trim())) return true;
    setFieldError({ email: t('auth.emailInvalid') });
    return false;
  };

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

  const submitPassword = () => {
    setFieldError({});
    if (!validEmail()) return;
    if (password.length < 8) return setFieldError({ password: t('auth.passwordShort') });
    run(async () => {
      const res = await api.identityAuthPasswordLogin({ email: email.trim(), password });
      await finishAuth(unwrap(res));
    });
  };

  const sendCode = () => {
    setFieldError({});
    if (!validEmail()) return;
    run(async () => {
      const res = await api.identityAuthSendCode({ email: email.trim(), purpose: 'login' });
      setCodeSent(true);
      cooldown.start(unwrap(res)?.retryAfterSeconds ?? 45);
    });
  };

  const verifyCode = () => {
    setFieldError({});
    if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) return setFieldError({ code: t('auth.codeFormat') });
    run(async () => {
      const res = await api.identityAuthVerifyCode({
        email: email.trim(),
        code: code.replace(/\s/g, ''),
      });
      await finishAuth(unwrap(res));
    });
  };

  return (
    <AuthShell title={t('auth.signIn.title')} subtitle={t('auth.signIn.subtitle')}>
      <Segmented
        value={method}
        onChange={(v) => {
          setMethod(v);
          setError(null);
          setFieldError({});
        }}
        options={[
          { value: 'password', label: t('auth.signIn.methodPassword') },
          { value: 'code', label: t('auth.signIn.methodCode') },
        ]}
      />
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
      {method === 'password' ? (
        <>
          <TextField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            error={fieldError.password}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submitPassword}
          />
          <Button title={t('auth.signIn.submit')} onPress={submitPassword} loading={busy} />
          <Button
            title={t('auth.signIn.forgot')}
            variant="tertiary"
            size="md"
            onPress={() => router.push('/sifre-sifirla')}
          />
        </>
      ) : codeSent ? (
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
          <Button title={t('auth.signIn.submit')} onPress={verifyCode} loading={busy} />
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
      <View style={{ alignItems: 'center' }}>
        <Button
          title={t('auth.signIn.toSignUp')}
          variant="tertiary"
          size="md"
          fullWidth={false}
          onPress={() => router.replace('/kayit')}
        />
      </View>
    </AuthShell>
  );
}
