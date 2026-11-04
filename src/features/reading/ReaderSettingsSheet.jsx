import { forwardRef } from 'react';
import { View } from 'react-native';
import { Segmented, Sheet, Text } from '@components';
import { useT } from '@shared/translation/useT';

function Row({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label-m">{label}</Text>
      {children}
    </View>
  );
}

/** Okuma ayarları: anında uygulanır ve sunucuya yazılır. */
export const ReaderSettingsSheet = forwardRef(function ReaderSettingsSheet({ prefs, update }, ref) {
  const { t } = useT();
  return (
    <Sheet ref={ref} title={t('read.reader.settings')}>
      <View style={{ gap: 14 }}>
        <Row label={t('read.set.font')}>
          <Segmented accessibilityLabel={t('read.set.font')} value={prefs.font} onChange={(v) => update({ readingFont: v })} options={[{ value: 'literata', label: 'Literata' }, { value: 'figtree', label: 'Figtree' }]} />
        </Row>
        <Row label={t('read.set.size')}>
          <Segmented accessibilityLabel={t('read.set.size')} value={prefs.scale} onChange={(v) => update({ readingTextScale: v })} options={[{ value: -1, label: 'A−' }, { value: 0, label: 'A' }, { value: 1, label: 'A+' }, { value: 2, label: 'A++' }]} />
        </Row>
        <Row label={t('read.set.spacing')}>
          <Segmented accessibilityLabel={t('read.set.spacing')} value={prefs.spacing} onChange={(v) => update({ readingLineSpacing: v })} options={[{ value: 0, label: t('read.set.spacingNormal') }, { value: 1, label: t('read.set.spacingWide') }]} />
        </Row>
        <Row label={t('read.set.theme')}>
          <Segmented accessibilityLabel={t('read.set.theme')} value={prefs.theme} onChange={(v) => update({ theme: v })} options={[{ value: 'system', label: t('read.set.themeSystem') }, { value: 'light', label: t('read.set.themeLight') }, { value: 'dark', label: t('read.set.themeDark') }]} />
        </Row>
      </View>
    </Sheet>
  );
});
