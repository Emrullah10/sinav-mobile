import { router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, EmptyState, ErrorState, IconButton, ListRow, Screen, Skeleton, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorKind, errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';

const PAGE_SIZE = 30;

function BookmarkRow({ b, divider, onRemove }) {
  const { t } = useT();
  // Not yer imlerinde başlık gelmez: içerik servisinden alınır.
  const isNote = b.itemKind === 'note';
  const note = useQuery({
    queryKey: queryKeys.content.note(b.itemCode),
    enabled: isNote && !b.title,
    queryFn: async () => unwrap(await api.contentNoteGet(b.itemCode)),
  });
  return (
    <ListRow
      title={b.title || note.data?.title || t('note.title')}
      subtitle={b.note || (isNote ? t('note.title') : undefined)}
      divider={divider}
      onPress={isNote ? () => router.push(deepLinks.note(b.itemCode)) : undefined}
      trailing={<IconButton icon={Trash2} size={36} accessibilityLabel={t('bookmarks.remove')} onPress={() => onRemove(b.code)} />}
    />
  );
}

export default function Bookmarks() {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['learning', 'bookmarks', { pageSize: PAGE_SIZE }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => unwrap(await api.learningBookmarksList({ page: pageParam, pageSize: PAGE_SIZE })),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.items) || [];
  const remove = useMutation({
    mutationFn: async (code) => api.learningBookmarkRemove(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning', 'bookmarks'] }),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  return (
    <Screen header={<TopBar title={t('bookmarks.title')} onBack={() => router.back()} />} edges={['bottom']}>
      {query.isPending ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : query.isError ? (
        <ErrorState kind={errorKind(query.error)} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t('bookmarks.empty')} />
      ) : (
        <View>
          {items.map((b, i) => (
            <BookmarkRow key={b.code} b={b} divider={i < items.length - 1} onRemove={(c) => remove.mutate(c)} />
          ))}
          {query.hasNextPage ? <Button title={t('mistakes.more')} variant="secondary" onPress={() => query.fetchNextPage()} loading={query.isFetchingNextPage} /> : null}
        </View>
      )}
    </Screen>
  );
}
