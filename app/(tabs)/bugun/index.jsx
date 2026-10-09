import { CalendarCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, PlaceholderScreen, Text } from '@components';
import { useAuthStore } from '@shared/auth/authStore';
import { ensureSession } from '@shared/auth/session';
import { useT } from '@shared/translation/useT';

/** Geliştirme tanılaması: oturum durumu + misafir oturumu akışı (yalnız __DEV__). */
function DevSession() {
  const { t } = useT();
  const { status, user, permissions, isGuest } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
    } catch (e) {
      setError(e?.message || 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ marginTop: 16, gap: 8 }}>
      <Text variant="overline" color="tertiary">
        DEV · OTURUM
      </Text>
      <Text
        variant="body-m"
        testID="auth-status"
      >{`status: ${status}${isGuest ? ' (misafir)' : ''}`}</Text>
      {user ? (
        <Text
          variant="body-s"
          color="secondary"
        >{`role: ${user.userAccountRole} · org: ${user.userAccountOrganizationId}`}</Text>
      ) : null}
      {permissions.length ? (
        <Text variant="caption" color="tertiary">
          {permissions.join(', ')}
        </Text>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {status !== 'authenticated' ? (
        <Button title={t('dev.guest.start')} loading={busy} onPress={start} size="md" />
      ) : null}
    </Card>
  );
}

export default function BugunScreen() {
  const { t } = useT();
  return (
    <PlaceholderScreen title={t('tabs.today')} icon={CalendarCheck}>
      {__DEV__ ? (
        <View>
          <DevSession />
        </View>
      ) : null}
    </PlaceholderScreen>
  );
}
