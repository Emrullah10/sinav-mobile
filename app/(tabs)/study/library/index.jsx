import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, Hourglass, Plus, ScanLine } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Button, Card, Chip, EmptyState, ListRow, ProgressBar, QueryBoundary, Screen, Segmented, Skeleton, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';
import { BookCover } from '@features/reading/BookCover';
import { UploadSheet } from '@features/reading/UploadSheet';
import { durationLabel, isBusy } from '@features/reading/helpers';

const LEVELS = ['A2', 'B1', 'B2', 'C1'];
const TOPICS = ['story', 'classic', 'academic', 'health', 'science', 'social'];

function BookTile({ book }) {
  const { t } = useT();
  const { width: screen } = useWindowDimensions();
  // İki sütun: kenarlar 16 + 16, sütun arası 16. Tablette kapak sınırlı kalır.
  const width = Math.min(220, Math.floor((screen - 48) / 2));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={book.title}
      onPress={() => router.push(deepLinks.book(book.code))}
      style={{ width, gap: 4 }}
    >
      <BookCover book={book} width={width} />
      <Text variant="title" numberOfLines={2}>{book.title}</Text>
      {book.author ? <Text variant="caption" color="secondary" numberOfLines={1}>{book.author}</Text> : null}
      <Text variant="caption" color="tertiary">{[book.level, durationLabel(t, book.readingMinutes)].filter(Boolean).join(' · ')}</Text>
      {book.progress ? <ProgressBar value={book.progress.percent / 100} height={4} /> : null}
    </Pressable>
  );
}

function ContinueTile({ book }) {
  const { t } = useT();
  const percent = Math.round(book.progress?.percent || 0);
  return (
    <Card onPress={() => router.push(deepLinks.reader(book.code))} accessibilityLabel={`${t('read.continue.title')}: ${book.title}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <BookCover book={book} width={64} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="title" numberOfLines={2}>{book.title}</Text>
        <Text variant="body-s" color="secondary">{t('read.continue.line', { section: (book.progress?.sectionPosition || 0) + 1, percent })}</Text>
        <ProgressBar value={percent / 100} height={4} />
      </View>
    </Card>
  );
}

function UploadRow({ book, divider }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const ocr = book.status === 'ocr_queued' || book.status === 'ocr_running';
  let Icon = FileText;
  let bg = colors.accent['subtle-bg'];
  let fg = colors.accent.default;
  let subtitle = [t('read.meta.pages', { n: book.pageCount }), book.progress ? t('read.meta.percent', { n: Math.round(book.progress.percent) }) : null].filter(Boolean).join(' · ');
  if (book.status === 'processing') {
    Icon = Hourglass;
    subtitle = t('read.status.processing');
  } else if (ocr) {
    Icon = Hourglass;
    subtitle = book.status === 'ocr_queued' ? t('read.status.ocrQueued') : t('read.status.ocr', { done: book.ocr.done, total: book.ocr.total });
  } else if (book.status === 'scanned') {
    Icon = ScanLine;
    bg = colors.reward['subtle-bg'];
    fg = colors.reward.icon;
    subtitle = `${t('read.status.scanned')} · ${t('read.status.scannedHint')}`;
  } else if (book.status === 'failed') {
    Icon = AlertCircle;
    bg = colors.danger.bg;
    fg = colors.danger.fg;
    subtitle = t(`apiErrors.${book.errorCode || 'READING_PDF_INVALID'}`);
  }
  return (
    <ListRow
      divider={divider}
      leading={
        <View style={{ width: 40, height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
          <Icon size={20} color={fg} />
        </View>
      }
      title={book.title}
      subtitle={subtitle}
      onPress={() => router.push(deepLinks.book(book.code))}
    />
  );
}

function Mine({ lib, onUpload, onDiscover }) {
  const { t } = useT();
  const { continue: cont, personal, quota } = lib;
  if (!cont.length && !personal.length) {
    return <EmptyState title={t('read.mine.emptyTitle')} description={t('read.mine.emptyBody')} actionLabel={t('read.mine.discoverCta')} onAction={onDiscover} />;
  }
  return (
    <View style={{ gap: 20 }}>
      {cont.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="heading-3">{t('read.continue.title')}</Text>
          {cont.map((b) => <ContinueTile key={b.code} book={b} />)}
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text variant="heading-3">{t('read.uploads.title')}</Text>
          <Text variant="label-s" color="secondary">{t('read.uploads.quota', { used: quota.books.used, limit: quota.books.limit })}</Text>
        </View>
        {personal.length ? (
          <Card style={{ paddingVertical: 0, paddingHorizontal: 0 }}>
            {personal.map((b, i) => <UploadRow key={b.code} book={b} divider={i < personal.length - 1} />)}
          </Card>
        ) : (
          <Card style={{ gap: 8 }}>
            <Text variant="body-s" color="secondary">{t('read.uploads.empty')}</Text>
            <Button title={t('read.upload.cta')} variant="secondary" size="md" onPress={onUpload} />
          </Card>
        )}
      </View>
    </View>
  );
}

function Discover() {
  const { t } = useT();
  const [level, setLevel] = useState(null);
  const [topic, setTopic] = useState(null);
  const params = useMemo(() => ({ ...(level ? { level } : {}), ...(topic ? { topic } : {}), pageSize: 60 }), [level, topic]);
  const q = useQuery({ queryKey: queryKeys.content.readingCatalog(params), queryFn: async () => unwrap(await api.contentReadingCatalog(params)) });
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={t('read.discover.all')} selected={!level} onPress={() => setLevel(null)} />
        {LEVELS.map((l) => <Chip key={l} label={l} selected={level === l} onPress={() => setLevel(level === l ? null : l)} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TOPICS.map((x) => <Chip key={x} size="sm" label={t(`enums.book_topic.${x}`)} selected={topic === x} onPress={() => setTopic(topic === x ? null : x)} />)}
      </View>
      <QueryBoundary query={q} skeleton={<View style={{ gap: 12 }}><Skeleton height={220} /><Skeleton height={220} /></View>}>
        {(d) =>
          d.items.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 }}>
              {d.items.map((b) => <BookTile key={b.code} book={b} />)}
            </View>
          ) : (
            <EmptyState title={t('read.discover.empty')} />
          )
        }
      </QueryBoundary>
    </View>
  );
}

/** READ-02/03: Kitaplık. Kitaplarım (devam edenler, yüklenenler) + Keşfet (hazır kitaplar). */
export default function LibraryScreen() {
  const { t } = useT();
  const upload = useRef(null);
  const [picked, setPicked] = useState(null);
  const lib = useQuery({
    queryKey: queryKeys.content.readingLibrary(),
    queryFn: async () => unwrap(await api.contentReadingLibrary()),
    refetchInterval: (query) => (query.state.data?.personal?.some(isBusy) ? 4000 : false),
  });
  const hasOwn = lib.data && (lib.data.continue.length > 0 || lib.data.personal.length > 0);
  const tab = picked || (lib.data && !hasOwn ? 'discover' : 'mine');
  return (
    <Screen
      header={
        <TopBar
          title={t('read.library.title')}
          onBack={() => router.back()}
          right={<Button title={t('read.upload.cta')} leftIcon={Plus} size="sm" fullWidth={false} onPress={() => upload.current?.present()} />}
        />
      }
      onRefresh={() => lib.refetch()}
      refreshing={lib.isRefetching && !lib.isPending}
    >
      <View style={{ gap: 16 }}>
        <Segmented accessibilityLabel={t('read.library.title')} value={tab} onChange={setPicked} options={[{ value: 'mine', label: t('read.tab.mine') }, { value: 'discover', label: t('read.tab.discover') }]} />
        {tab === 'discover' ? (
          <Discover />
        ) : (
          <QueryBoundary query={lib}>
            {(d) => <Mine lib={d} onUpload={() => upload.current?.present()} onDiscover={() => setPicked('discover')} />}
          </QueryBoundary>
        )}
      </View>
      <UploadSheet ref={upload} quota={lib.data?.quota} />
    </Screen>
  );
}
