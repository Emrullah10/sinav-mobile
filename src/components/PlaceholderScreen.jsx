import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { TopBar } from './TopBar';
import { useT } from '@shared/translation/useT';

/** Sonraki adımlarda gerçek ekranla değiştirilecek geçici ekran. */
export function PlaceholderScreen({ title, children, icon }) {
  const { t } = useT();
  return (
    <Screen header={<TopBar variant="large" title={title} />}>
      <EmptyState icon={icon} title={t('placeholder.title')} description={t('placeholder.body')} />
      {children}
    </Screen>
  );
}
