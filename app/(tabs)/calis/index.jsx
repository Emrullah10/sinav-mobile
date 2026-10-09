import { BookOpen } from 'lucide-react-native';
import { PlaceholderScreen } from '@components/PlaceholderScreen';
import { useT } from '@shared/translation/useT';

export default function CalisScreen() {
  const { t } = useT();
  return <PlaceholderScreen title={t('tabs.study')} icon={BookOpen} />;
}
