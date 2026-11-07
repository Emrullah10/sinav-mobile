import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Check, FileText, ListChecks, Pencil, ScanLine, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Banner, Button, Chip, IconButton, ProgressBar, QueryBoundary, Screen, Sheet, Text, TextField, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';
import { BookCover } from '@features/reading/BookCover';
import { durationLabel, isBusy, sectionTitle } from '@features/reading/helpers';

function OcrPanel({ book, quota, onChange }) {
  const { t } = useT();
  const toast = useToast();
  const start = useMutation({
    mutationFn: async () => unwrap(await api.contentReadingOcrStart(book.code)),
    onSuccess: () => {
      toast.show({ message: t('read.ocr.started'), tone: 'success' });
      onChange();
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const left = quota ? Math.max(0, quota.ocrPages.limit - quota.ocrPages.used) : 0;
  const pages = book.ocr.textlessPages;
  const premium = quota?.tier === 'premium';
  const enough = left >= pages;
  return (
    <View style={{ gap: 10 }}>
      <Banner tone="warning" title={t('read.ocr.title')} message={t('read.ocr.body')} />
      {book.errorCode ? <Banner tone="danger" message={t(`apiErrors.${book.errorCode}`)} /> : null}
      <Text variant="body-s" color="secondary">
        {!premium ? t('read.ocr.premium') : enough ? t('read.ocr.info', { pages, left }) : t('read.ocr.notEnough', { left, pages })}
      </Text>
      {premium ? (
        <Button title={t('read.ocr.cta')} leftIcon={ScanLine} disabled={!enough} loading={start.isPending} onPress={() => start.mutate()} />
      ) : (
        <Button title={t('read.detail.upgrade')} onPress={() => router.push('/premium')} />
      )}
      {book.hasFile ? <Button title={t('read.ocr.later')} variant="secondary" leftIcon={FileText} onPress={() => router.push(deepLinks.readerPdf(book.code))} /> : null}
    </View>
  );
}

/** READ-04: kitap ayrıntısı. Kişisel kitapta işleniyor / taranmış / hata durumları burada anlatılır. */
export default function BookDetailScreen() {
  const { code } = useLocalSearchParams();
  const { t } = useT();
  const { colors, radius } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const renameSheet = useRef(null);
  const [form, setForm] = useState({ title: '', author: '' });
  const q = useQuery({
    queryKey: queryKeys.content.readingBook(code),
    queryFn: async () => unwrap(await api.contentReadingBookGet(code)),
    refetchInterval: (query) => (isBusy(query.state.data) ? 4000 : false),
  });
  const lib = useQuery({ queryKey: queryKeys.content.readingLibrary(), queryFn: async () => unwrap(await api.contentReadingLibrary()) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: queryKeys.content.readingBook(code) });
    qc.invalidateQueries({ queryKey: queryKeys.content.readingLibrary() });
  };
  const save = useMutation({
    mutationFn: async () => unwrap(await api.contentReadingBookUpdate(code, form)),
    onSuccess: () => {
      renameSheet.current?.dismiss();
      refresh();
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const del = useMutation({
    mutationFn: async () => unwrap(await api.contentReadingBookDelete(code)),
    onSuccess: () => {
      toast.show({ message: t('read.detail.deleted'), tone: 'success' });
      qc.invalidateQueries({ queryKey: queryKeys.content.readingLibrary() });
      router.back();
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const confirmDelete = () =>
    Alert.alert(t('read.detail.deleteTitle'), t('read.detail.deleteBody'), [
      { text: t('read.detail.cancel'), style: 'cancel' },
      { text: t('read.detail.delete'), style: 'destructive', onPress: () => del.mutate() },
    ]);
  const b = q.data;
  const personal = b?.kind === 'personal';
  return (
    <Screen
      header={
        <TopBar
          title={t('read.library.title')}
          onBack={() => router.back()}
          right={
            personal ? (
              <View style={{ flexDirection: 'row' }}>
                <IconButton icon={Pencil} accessibilityLabel={t('read.detail.rename')} onPress={() => { setForm({ title: b.title, author: b.author || '' }); renameSheet.current?.present(); }} />
                <IconButton icon={Trash2} accessibilityLabel={t('read.detail.delete')} onPress={confirmDelete} />
              </View>
            ) : null
          }
        />
      }
    >
      <QueryBoundary query={q}>
        {(book) => {
          const current = book.progress?.sectionPosition ?? -1;
          const ocr = book.status === 'ocr_queued' || book.status === 'ocr_running';
          return (
            <View style={{ gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <BookCover book={book} width={148} />
                <Text variant="heading-2" align="center" accessibilityRole="header">{book.title}</Text>
                {book.author ? <Text variant="body-m" color="secondary" align="center">{book.author}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                {book.level ? <Chip size="sm" label={book.level} /> : null}
                {book.topic ? <Chip size="sm" label={t(`enums.book_topic.${book.topic}`)} /> : null}
                {book.wordCount > 0 ? <Chip size="sm" label={durationLabel(t, book.readingMinutes)} /> : null}
                {book.pageCount > 0 ? <Chip size="sm" label={t('read.meta.pages', { n: book.pageCount })} /> : null}
              </View>
              {book.description ? <Text variant="body-m">{book.description}</Text> : null}
              {book.language === 'other' && book.status === 'ready' ? <Banner tone="info" message={t('read.detail.otherLang')} /> : null}

              {book.status === 'processing' ? (
                <View style={{ gap: 8 }}>
                  <ProgressBar indeterminate />
                  <Text variant="title">{t('read.status.processing')}</Text>
                  <Text variant="body-s" color="secondary">{t('read.detail.processingBody')}</Text>
                </View>
              ) : null}
              {ocr ? (
                <View style={{ gap: 8 }}>
                  <ProgressBar value={book.ocr.total ? book.ocr.done / book.ocr.total : 0} />
                  <Text variant="title">{book.status === 'ocr_queued' ? t('read.status.ocrQueued') : t('read.status.ocr', { done: book.ocr.done, total: book.ocr.total })}</Text>
                  <Text variant="body-s" color="secondary">{t('read.ocr.progressBody')}</Text>
                </View>
              ) : null}
              {book.status === 'failed' ? <Banner tone="danger" title={t(`apiErrors.${book.errorCode || 'READING_PDF_INVALID'}`)} message={t('read.detail.failedBody')} /> : null}
              {book.status === 'scanned' ? <OcrPanel book={book} quota={lib.data?.quota} onChange={refresh} /> : null}
              {book.locked ? <Banner tone="warning" message={t('read.detail.locked')} action={{ label: t('read.detail.upgrade'), onPress: () => router.push('/premium') }} /> : null}

              {book.status === 'ready' && !book.locked ? (
                <View style={{ gap: 8 }}>
                  <Button title={book.progress ? t('read.detail.continue') : t('read.detail.start')} leftIcon={BookOpen} onPress={() => router.push(deepLinks.reader(book.code))} />
                  {book.hasFile ? <Button title={t('read.detail.original')} variant="secondary" leftIcon={FileText} onPress={() => router.push(deepLinks.readerPdf(book.code))} /> : null}
                  <Button title={t('read.quiz.cta')} variant="secondary" leftIcon={ListChecks} onPress={() => router.push(deepLinks.readerQuiz(book.code))} />
                </View>
              ) : null}

              {book.status === 'ready' && book.sections.length ? (
                <View style={{ gap: 4 }}>
                  <Text variant="heading-3">{t('read.detail.toc')}</Text>
                  {book.sections.map((s) => (
                    <Pressable
                      key={s.position}
                      disabled={book.locked}
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: deepLinks.reader(book.code), params: { bolum: String(s.position) } })}
                      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, borderRadius: radius.sm, backgroundColor: s.position === current ? colors.accent['subtle-bg'] : 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}
                    >
                      <Text variant="body-m" numberOfLines={2} style={{ flex: 1 }}>{sectionTitle(t, s)}</Text>
                      {s.position < current ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={14} color={colors.success.fg} />
                          <Text variant="caption" color="success">{t('read.section.read')}</Text>
                        </View>
                      ) : (
                        <Text variant="caption" color="tertiary">{durationLabel(t, Math.max(1, Math.round(s.wordCount / 180)))}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {book.attribution ? <Text variant="caption" color="tertiary">{t('read.meta.source', { source: book.attribution, license: book.license || '' })}</Text> : book.license ? <Text variant="caption" color="tertiary">{book.license}</Text> : null}
            </View>
          );
        }}
      </QueryBoundary>
      <Sheet ref={renameSheet} title={t('read.detail.rename')}>
        <View style={{ gap: 12 }}>
          <TextField label={t('read.detail.titleLabel')} value={form.title} onChangeText={(title) => setForm((f) => ({ ...f, title }))} maxLength={300} />
          <TextField label={t('read.detail.authorLabel')} value={form.author} onChangeText={(author) => setForm((f) => ({ ...f, author }))} maxLength={200} />
          <Button title={t('read.detail.save')} disabled={!form.title.trim()} loading={save.isPending} onPress={() => save.mutate()} />
        </View>
      </Sheet>
    </Screen>
  );
}
