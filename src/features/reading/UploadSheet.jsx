import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, FileUp } from 'lucide-react-native';
import { forwardRef, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banner, Button, ProgressBar, Sheet, Text, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { report } from '@shared/monitoring/report';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';

/** PDF yükleme: dosya + hak beyanı → ilerleme → kitap ayrıntısı (metin arka planda hazırlanır). quota: library.quota */
export const UploadSheet = forwardRef(function UploadSheet({ quota }, ref) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const abort = useRef(null);
  const [file, setFile] = useState(null);
  const [rights, setRights] = useState(false);
  const [percent, setPercent] = useState(null);
  const [error, setError] = useState(null);
  const maxBytes = quota?.file?.maxBytes || 50 * 1048576;
  const full = quota && quota.books.used >= quota.books.limit;

  const reset = () => {
    setFile(null);
    setRights(false);
    setPercent(null);
    setError(null);
  };
  const choose = async () => {
    setError(null);
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
      if (r.canceled) return;
      const f = r.assets?.[0];
      if (!f) return;
      if (f.size && f.size > maxBytes) {
        setError(t('apiErrors.READING_PDF_TOO_LARGE'));
        return;
      }
      setFile(f);
    } catch (e) {
      report(e, { where: 'reading.pick' });
      setError(t('apiErrors.READING_PDF_INVALID'));
    }
  };
  const submit = async () => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name || 'book.pdf', type: 'application/pdf' });
    form.append('rightsConfirmed', 'true');
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPercent(0);
    setError(null);
    try {
      const book = unwrap(
        await api.contentReadingUpload(form, {
          signal: ctrl.signal,
          onUploadProgress: (ev) => setPercent(ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0),
        }),
      );
      qc.invalidateQueries({ queryKey: queryKeys.content.readingLibrary() });
      toast.show({ message: t(book.duplicate ? 'read.upload.duplicate' : 'read.upload.done'), tone: 'success' });
      reset();
      ref?.current?.dismiss();
      router.push(deepLinks.book(book.code));
    } catch (e) {
      setPercent(null);
      if (!ctrl.signal.aborted) setError(errorText(t, e));
    }
  };

  const uploading = percent !== null;
  return (
    <Sheet ref={ref} title={t('read.upload.title')} dismissible={!uploading} onDismiss={reset}>
      <View style={{ gap: 14 }}>
        {full ? (
          <Banner
            tone="warning"
            title={t('read.upload.limitTitle')}
            message={t('read.upload.limitBody', { limit: quota.books.premiumLimit })}
            action={quota.tier !== 'premium' ? { label: t('read.detail.upgrade'), onPress: () => router.push('/premium') } : undefined}
          />
        ) : uploading ? (
          <View style={{ gap: 8 }}>
            <Text variant="title" numberOfLines={2}>{file?.name}</Text>
            <ProgressBar value={percent / 100} />
            <Text variant="body-s" color="secondary">{t('read.upload.progress', { n: percent })}</Text>
            <Text variant="body-s" color="secondary">{t('read.upload.after')}</Text>
            <Button title={t('read.upload.cancel')} variant="secondary" size="md" onPress={() => abort.current?.abort()} />
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('read.upload.choose')}
              onPress={choose}
              style={{ alignItems: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border.strong, borderRadius: radius.lg, backgroundColor: colors.bg.canvas }}
            >
              <FileUp size={28} color={colors.accent.default} />
              <Text variant="title" align="center" numberOfLines={2}>{file ? file.name : t('read.upload.choose')}</Text>
              <Text variant="caption" color="tertiary" align="center">
                {file ? t('read.upload.change') : t('read.upload.limits', { mb: Math.round(maxBytes / 1048576), pages: quota?.file?.maxPages || 1500 })}
              </Text>
            </Pressable>
            {quota ? (
              <Text variant="body-s" color="secondary">{t('read.uploads.quota', { used: quota.books.used, limit: quota.books.limit })}</Text>
            ) : null}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rights }}
              onPress={() => setRights((v) => !v)}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 44 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: radius.xs, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: rights ? colors.accent.default : colors.border.input, backgroundColor: rights ? colors.accent.default : 'transparent' }}>
                {rights ? <Check size={16} color={colors.text['on-accent']} /> : null}
              </View>
              <Text variant="body-s" style={{ flex: 1 }}>{t('read.upload.rights')}</Text>
            </Pressable>
            <Button title={t('read.upload.submit')} disabled={!file || !rights} onPress={submit} />
          </>
        )}
        {error ? <Banner tone="danger" message={error} /> : null}
      </View>
    </Sheet>
  );
});
