import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileText, Headphones, Languages, List, Type } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, View } from 'react-native';
import { Button, ErrorState, IconButton, ProgressBar, QueryBoundary, Screen, Sheet, Skeleton, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorKind, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';
import { TapText } from '@features/lexicon/TapText';
import { useLexicon } from '@features/lexicon/LexiconProvider';
import { ParagraphTranslation } from '@features/reading/ParagraphTranslation';
import { ReadAloudBar } from '@features/reading/ReadAloudBar';
import { ReaderSettingsSheet } from '@features/reading/ReaderSettingsSheet';
import { sectionTitle } from '@features/reading/helpers';
import { useReadAloud } from '@features/reading/useReadAloud';
import { useReaderPrefs } from '@features/reading/useReaderPrefs';
import { useHeartbeat } from '@hooks/useHeartbeat';

const SAVE_EVERY_MS = 4000;
const VIEWABILITY = { itemVisiblePercentThreshold: 10 };

const Block = memo(function Block({ block, lang, bookCode, textStyle, speaking }) {
  const { t } = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (block.t === 'h') {
    return (
      <TapText variant="heading-3" accessibilityRole="header" text={block.x} lang={lang} bookCode={bookCode} speaking={speaking} style={{ marginTop: 16, marginBottom: 10 }} />
    );
  }
  return (
    <View style={{ marginBottom: 16 }}>
      <TapText variant="reading-l" text={block.x} lang={lang} bookCode={bookCode} speaking={speaking} style={textStyle} />
      {open ? (
        <ParagraphTranslation text={block.x} lang={lang} bookCode={bookCode} onClose={() => setOpen(false)} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('read.reader.translate')}
          hitSlop={8}
          onPress={() => setOpen(true)}
          style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4 }}
        >
          <Languages size={14} color={colors.text.tertiary} />
          <Text variant="caption" color="tertiary">{t('read.reader.translate')}</Text>
        </Pressable>
      )}
    </View>
  );
});

/** READ-06/07: okuyucu. Kelimeye dokun → sözlük, cümleye basılı tut → çeviri, paragraf altında Türkçesi. Kaldığı yer sunucuda (cihazlar arası). */
export default function ReaderScreen() {
  const { code, bolum } = useLocalSearchParams();
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const toc = useRef(null);
  const settings = useRef(null);
  const list = useRef(null);
  const { prefs, update, textStyle } = useReaderPrefs();
  const [picked, setPicked] = useState(bolum !== undefined ? Number(bolum) : null);
  const [visible, setVisible] = useState(0);

  const bookQ = useQuery({ queryKey: queryKeys.content.readingBook(code), queryFn: async () => unwrap(await api.contentReadingBookGet(code)) });
  const book = bookQ.data;
  useHeartbeat(null, Boolean(book));
  const position = picked ?? book?.progress?.sectionPosition ?? 0;
  const sectionQ = useQuery({
    queryKey: queryKeys.content.readingSection(code, position),
    queryFn: async () => unwrap(await api.contentReadingSectionGet(code, position)),
    enabled: Boolean(book) && book.status === 'ready' && !book.locked,
    staleTime: Infinity,
  });
  const section = sectionQ.data;
  const lang = book?.language === 'en' ? 'en' : 'auto';

  const totals = useMemo(() => {
    const secs = book?.sections || [];
    const total = secs.reduce((n, s) => n + s.wordCount, 0) || 1;
    const before = secs.filter((s) => s.position < position).reduce((n, s) => n + s.wordCount, 0);
    return { total, before, cur: secs.find((s) => s.position === position) };
  }, [book, position]);
  const blockCount = section?.blocks?.length || 1;
  const percent = Math.min(100, ((totals.before + (totals.cur?.wordCount || 0) * (visible / blockCount)) / totals.total) * 100);

  // Kaldığı yere dön: bölüm ilk açıldığında, kitaptan gelen blok konumuna kaydır.
  const restored = useRef(null);
  useEffect(() => {
    if (!section || restored.current === position) return;
    restored.current = position;
    const target = picked === null && book?.progress?.sectionPosition === position ? book.progress.blockIndex : 0;
    setVisible(target);
    if (target > 0 && target < section.blocks.length) {
      requestAnimationFrame(() => list.current?.scrollToIndex({ index: target, animated: false }));
    } else {
      list.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [section, position, picked, book]);

  const onViewable = useRef(({ viewableItems }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) setVisible(first.index);
  }).current;

  // Kaldığı yer: birkaç saniyede bir, arka plana geçince ve çıkarken yazılır.
  const latest = useRef(null);
  useEffect(() => {
    latest.current = book && section ? { sectionPosition: position, blockIndex: visible, pageNo: section.blocks?.[visible]?.pg ?? null, percent: Math.round(percent * 100) / 100 } : null;
  }, [book, section, position, visible, percent]);
  const lastSaved = useRef('');
  const save = useCallback(() => {
    const body = latest.current;
    if (!body) return;
    const key = JSON.stringify(body);
    if (key === lastSaved.current) return;
    lastSaved.current = key;
    api.contentReadingProgressSave(code, body).then(() => qc.invalidateQueries({ queryKey: queryKeys.content.readingLibrary() })).catch(() => {});
  }, [code, qc]);
  useEffect(() => {
    const id = setInterval(save, SAVE_EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') save(); });
    return () => {
      clearInterval(id);
      sub.remove();
      save();
    };
  }, [save]);

  // Sesli okuma (abonelik): cihazın konuşma motoru. Bölüm bitince sonraki bölüme geçip sürer.
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const isGuest = useAuthStore((s) => s.isGuest);
  const entQ = useQuery({ queryKey: queryKeys.billing.entitlements(), enabled: authed && !isGuest, queryFn: async () => unwrap(await api.billingEntitlementsGet()) });
  const canListen = Boolean(entQ.data?.features?.read_aloud?.enabled);
  const continueNext = useRef(false);
  // Bölüm sesli okunarak bitti: okuma kaydedilir, sonraki bölüme geçilir; yüklenince baştan sürer.
  const onAloudEnd = useCallback(() => {
    const secs = book?.sections || [];
    const at = secs.findIndex((x) => x.position === position);
    const n = at >= 0 ? secs[at + 1] : null;
    if (!n) return;
    save();
    continueNext.current = true;
    setVisible(0);
    setPicked(n.position);
  }, [book, position, save]);
  const aloud = useReadAloud({ blocks: section?.blocks, lang, onEnd: onAloudEnd });
  const lex = useLexicon();
  // Sözlük/çeviri açılınca okuma duraklar (kullanıcı kelimeye bakıyor).
  useEffect(() => {
    if (lex?.active && aloud.status === 'playing') aloud.pause();
  }, [lex?.active]); // eslint-disable-line react-hooks/exhaustive-deps
  // Yeni bölüm yüklendi ve önceki bölüm sesli okunarak bittiyse baştan sürer.
  useEffect(() => {
    if (!section || !continueNext.current) return;
    continueNext.current = false;
    aloud.playFrom(0);
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps
  // Okunan blok ekranda kalsın.
  const speakingBlock = aloud.current?.block ?? null;
  useEffect(() => {
    if (speakingBlock == null || aloud.status !== 'playing') return;
    list.current?.scrollToIndex({ index: speakingBlock, animated: true, viewPosition: 0.2 });
  }, [speakingBlock]); // eslint-disable-line react-hooks/exhaustive-deps
  const listen = () => {
    if (!canListen) {
      toast.show({ message: t('read.aloud.locked'), actionLabel: t('read.aloud.upgrade'), onAction: () => router.push(deepLinks.premium) });
      return;
    }
    if (aloud.status === 'idle') aloud.playFrom(visible);
    else aloud.toggle();
  };

  const goSection = (n) => {
    save();
    toc.current?.dismiss();
    aloud.stop();
    setVisible(0);
    setPicked(n);
  };
  const finish = async () => {
    await api.contentReadingProgressSave(code, { sectionPosition: position, blockIndex: visible, percent: 100 }).catch(() => {});
    latest.current = null;
    qc.invalidateQueries({ queryKey: queryKeys.content.readingLibrary() });
    qc.invalidateQueries({ queryKey: queryKeys.content.readingBook(code) });
    toast.show({ message: t('read.reader.finished'), tone: 'success' });
    router.back();
  };

  if (book && (book.status !== 'ready' || book.locked)) return <Redirect href={deepLinks.book(code)} />;

  const idx = book?.sections?.findIndex((s) => s.position === position) ?? -1;
  const prev = idx > 0 ? book.sections[idx - 1] : null;
  const next = idx >= 0 ? book.sections[idx + 1] : null;
  const pdfPage = section?.blocks?.[visible]?.pg;

  const header = (
    <View>
      <TopBar
        title={book?.title || ''}
        subtitle={book ? sectionTitle(t, totals.cur) : undefined}
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon={Headphones}
              variant={aloud.status === 'idle' ? 'standard' : 'tonal'}
              accessibilityLabel={t('read.aloud.listen')}
              onPress={listen}
            />
            <IconButton icon={List} accessibilityLabel={t('read.reader.toc')} onPress={() => toc.current?.present()} />
            <IconButton icon={Type} accessibilityLabel={t('read.reader.settings')} onPress={() => settings.current?.present()} />
            {book?.hasFile ? (
              <IconButton
                icon={FileText}
                accessibilityLabel={t('read.reader.original')}
                onPress={() => { save(); router.push({ pathname: deepLinks.readerPdf(code), params: pdfPage ? { sayfa: String(pdfPage) } : {} }); }}
              />
            ) : null}
          </View>
        }
      />
      <ProgressBar value={percent / 100} height={4} accessibilityLabel={t('read.reader.percent', { n: Math.round(percent) })} />
    </View>
  );

  return (
    <Screen
      header={header}
      footer={aloud.status !== 'idle' ? <ReadAloudBar aloud={aloud} /> : undefined}
      scroll={false}
      padded={false}
      keyboardAvoiding={false}
      edges={[]}
    >
      <QueryBoundary query={bookQ} skeleton={<View style={{ padding: 16, gap: 12 }}><Skeleton height={32} /><Skeleton height={240} /></View>}>
        {() =>
          sectionQ.isError ? (
            <ErrorState kind={errorKind(sectionQ.error)} onRetry={() => sectionQ.refetch()} />
          ) : !section ? (
            <View style={{ padding: 16, gap: 12 }}><Skeleton height={32} /><Skeleton height={240} /></View>
          ) : (
            <FlatList
              ref={list}
              key={`section-${position}`}
              data={section.blocks}
              keyExtractor={(_b, i) => `${position}.${i}`}
              renderItem={({ item, index }) => (
                <Block block={item} lang={lang} bookCode={book.code} textStyle={textStyle} speaking={speakingBlock === index ? aloud.current.sentence : null} />
              )}
              extraData={[textStyle, aloud.current]}
              initialNumToRender={14}
              maxToRenderPerBatch={10}
              windowSize={9}
              onViewableItemsChanged={onViewable}
              viewabilityConfig={VIEWABILITY}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
              onScrollToIndexFailed={(info) => {
                list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
                setTimeout(() => list.current?.scrollToIndex({ index: info.index, animated: false }), 60);
              }}
              ListHeaderComponent={
                <View style={{ gap: 10, marginBottom: 16 }}>
                  <Text variant="caption" color="tertiary">{t('read.reader.tip')}</Text>
                  {section.title && section.blocks[0]?.t !== 'h' ? <Text variant="heading-2" accessibilityRole="header">{section.title}</Text> : null}
                </View>
              }
              ListFooterComponent={
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.default }}>
                  {prev ? <Button title={t('read.reader.prev')} leftIcon={ChevronLeft} variant="secondary" size="md" style={{ flex: 1 }} onPress={() => goSection(prev.position)} /> : null}
                  {next ? (
                    <Button title={t('read.reader.next')} rightIcon={ChevronRight} size="md" style={{ flex: 1 }} onPress={() => goSection(next.position)} />
                  ) : (
                    <Button title={t('read.reader.finish')} size="md" style={{ flex: 1 }} onPress={finish} />
                  )}
                </View>
              }
            />
          )
        }
      </QueryBoundary>
      <Sheet ref={toc} title={t('read.reader.toc')} scrollable snapPoints={['70%']}>
        <View style={{ gap: 2 }}>
          {(book?.sections || []).map((s) => (
            <Pressable
              key={s.position}
              accessibilityRole="button"
              accessibilityState={{ selected: s.position === position }}
              onPress={() => goSection(s.position)}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: s.position === position ? colors.accent['subtle-bg'] : 'transparent' }}
            >
              <Text variant="body-m" numberOfLines={2}>{sectionTitle(t, s)}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
      <ReaderSettingsSheet ref={settings} prefs={prefs} update={update} />
    </Screen>
  );
}
