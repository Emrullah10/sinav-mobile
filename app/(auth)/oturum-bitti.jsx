import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Button, EmptyState, Screen } from '@components';
import { useAuthStore } from '@shared/auth/authStore';
import { useT } from '@shared/translation/useT';

/** SYS-07: oturum bitti -> giriş. */
export default function SessionEnded() {
  const { t } = useT();
  const clear = useAuthStore((s) => s.clearSessionEnded);
  return (
    <Screen edges={['top', 'bottom']}>
      <EmptyState
        icon={LogOut}
        title={t('session.ended.title')}
        description={t('session.ended.body')}
      />
      <Button
        title={t('session.ended.action')}
        onPress={() => {
          clear();
          router.replace('/giris');
        }}
      />
    </Screen>
  );
}
