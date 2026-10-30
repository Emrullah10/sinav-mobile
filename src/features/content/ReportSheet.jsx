import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Sheet, TextField, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';

const REASONS = ['wrong_answer_key', 'typo', 'unclear', 'other'];

/**
 * "Hata bildir" alt sayfası. Kullanım: ref.current.present({ itemCode, context }).
 * Neden etiketleri uygulamaya özel `report.reason.*` anahtarlarıdır (vendor `enums.report_reason.*` öğretmen
 * raporlarıyla çakışıp "Soru belirsiz" yerine "Anlaşılmıyor" gösterebilir).
 */
export const ReportSheet = forwardRef(function ReportSheet(_props, ref) {
  const { t } = useT();
  const toast = useToast();
  const sheet = useRef(null);
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    present: (next) => {
      setTarget(next);
      setNote('');
      sheet.current?.present();
    },
    dismiss: () => sheet.current?.dismiss(),
  }));

  const submit = async (reason) => {
    if (!target?.itemCode || busy) return;
    setBusy(true);
    try {
      const res = unwrap(
        await api.contentReportCreate({
          itemCode: target.itemCode,
          reason,
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(target.context ? { context: target.context } : {}),
        }),
      );
      sheet.current?.dismiss();
      toast.show({
        message: res?.duplicate ? t('report.duplicate') : t('report.thanks'),
        tone: 'success',
      });
    } catch (err) {
      toast.show({ message: errorText(t, err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheet} title={t('report.title')}>
      <View style={{ gap: 12 }}>
        <TextField
          label={t('report.note')}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
        />
        {REASONS.map((r) => (
          <Button
            key={r}
            title={t(`report.reason.${r}`)}
            variant="secondary"
            size="md"
            disabled={busy}
            onPress={() => submit(r)}
          />
        ))}
      </View>
    </Sheet>
  );
});
