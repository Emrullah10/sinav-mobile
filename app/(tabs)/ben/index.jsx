import { User } from 'lucide-react-native';
import { PlaceholderScreen } from '@components/PlaceholderScreen';
import { useT } from '@shared/translation/useT';

export default function BenScreen() {
  const { t } = useT();
  return <PlaceholderScreen title={t('tabs.me')} icon={User} />;
}
