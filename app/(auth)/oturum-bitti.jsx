import { router } from 'expo-router';
import { Button, EmptyState, Screen } from '@components';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '@shared/auth/authStore';
import { useT } from '@shared/translation/useT';

/** SYS-07 (geçici ekran): oturum bitti. Gerçek giriş akışı AUTH ekranlarında gelecek. */
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
          router.replace('/');
        }}
      />
    </Screen>
  );
}
