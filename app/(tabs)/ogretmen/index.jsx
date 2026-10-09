import { GraduationCap } from 'lucide-react-native';
import { PlaceholderScreen } from '@components/PlaceholderScreen';
import { useT } from '@shared/translation/useT';

export default function OgretmenScreen() {
  const { t } = useT();
  return <PlaceholderScreen title={t('tabs.tutor')} icon={GraduationCap} />;
}
