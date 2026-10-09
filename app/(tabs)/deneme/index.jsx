import { ClipboardCheck } from 'lucide-react-native';
import { PlaceholderScreen } from '@components/PlaceholderScreen';
import { useT } from '@shared/translation/useT';

export default function DenemeScreen() {
  const { t } = useT();
  return <PlaceholderScreen title={t('tabs.exam')} icon={ClipboardCheck} />;
}
