import { router } from 'expo-router';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { BookmarkPlus, Layers, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Chip, EmptyState, ErrorState, Screen, Skeleton, Text, TopBar } from '@components';
import { api } from '@api';
import { errorKind, unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';

const FILTERS = ['all', 'due', 'new', 'learning', 'review'];

/** Kartın durumu (sunucunun süzgeciyle aynı kural). */
const statusOf = (w, now) => {
  if (w.state === 'new') return 'new';
  if (w.dueAt && new Date(w.dueAt).getTime() <= now) return 'due';
  if (w.state === 'learning' || w.state === 'relearning') return 'learning';
  return 'review';
};

/** Kaydettiğin kelimelerin tam listesi: arama ve durum süzgeci sunucuda; satıra dokununca kelimenin ayrıntısı. */
export default function SavedWordsScreen() {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const [text, setText] = useState('');
  const [needle, setNeedle] = useState('');
  const [filter, setFilter] = useState('all');
  const [now] = useState(() => Date.now());
  useEffect(() => {
    const id = setTimeout(() => setNeedle(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);
  const q = useInfiniteQuery({
    queryKey: [...queryKeys.learning.vocabMyWords(), 'list', filter, needle],
    queryFn: async ({ pageParam }) => unwrap(await api.learningVocabMyWords({
      limit: 40, before: pageParam || undefined, status: filter === 'all' ? undefined : filter, q: needle || undefined,
    })),
    initialPageParam: null,
    getNextPageParam: (last) => last?.nextBefore || undefined,
    placeholderData: keepPreviousData,
  });
  const first = q.data?.pages[0];
  const total = first?.total ?? 0;
  const counts = first?.counts || {};
  const items = (q.data?.pages.flatMap((p) => p?.items || []) || []).map((w) => ({ ...w, status: statusOf(w, now) }));
  const tone = { new: colors.accent.default, due: colors.warning.fg, learning: colors.text.secondary, review: colors.success.fg };

  let body;
  if (q.isPending) {
    body = <View style={{ gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</View>;
  } else if (q.isError) {
    body = <ErrorState kind={errorKind(q.error)} onRetry={() => q.refetch()} />;
  } else if (!total) {
    body = <EmptyState icon={BookmarkPlus} title={t('vocab.saved.emptyTitle')} description={t('vocab.saved.empty')} actionLabel={t('vocab.saved.toLibrary')} onAction={() => router.push(deepLinks.library)} />;
  } else {
    body = (
      <View style={{ gap: 12 }}>
        <Button title={t('vocab.saved.study')} leftIcon={Layers} onPress={() => router.push({ pathname: deepLinks.vocabReview, params: { source: 'saved' } })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface }}>
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('vocab.saved.search')}
            placeholderTextColor={colors.text.tertiary}
            accessibilityLabel={t('vocab.saved.search')}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={{ flex: 1, minHeight: 44, color: colors.text.primary, fontSize: 16 }}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.filter((f) => f === 'all' || counts[f] || f === filter).map((f) => (
            <Chip
              key={f}
              size="sm"
              selected={filter === f}
              onPress={() => setFilter(f)}
              label={f === 'all' ? `${t('vocab.saved.f.all')} · ${total}` : `${t(`vocab.saved.s.${f}`)} · ${counts[f] || 0}`}
            />
          ))}
        </ScrollView>
        {items.length ? (
          <Card padded={false} style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }}>
            {items.map((w, i) => (
              <Pressable
                key={w.cardCode}
                accessibilityRole="button"
                accessibilityLabel={`${w.headword}${w.meaning ? `, ${w.meaning}` : ''}, ${t(`vocab.saved.s.${w.status}`)}`}
                onPress={() => router.push(deepLinks.vocabWord(w.itemCode))}
                style={({ pressed }) => ({
                  minHeight: 56,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  gap: 2,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border.default,
                  backgroundColor: pressed ? colors.bg.pressed : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text variant="label-l" style={{ flexShrink: 1 }} numberOfLines={1}>{w.headword}</Text>
                  <Text variant="caption" style={{ marginLeft: 'auto', color: tone[w.status] }}>{t(`vocab.saved.s.${w.status}`)}</Text>
                </View>
                {w.meaning ? <Text variant="body-s" color="secondary" numberOfLines={2}>{w.meaning}</Text> : null}
              </Pressable>
            ))}
          </Card>
        ) : (
          <Text variant="body-m" color="secondary">{t('vocab.saved.noMatch')}</Text>
        )}
        {q.hasNextPage ? <Button title={t('vocab.saved.more')} variant="secondary" size="md" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} /> : null}
      </View>
    );
  }

  return (
    <Screen header={<TopBar title={t('vocab.saved.title')} subtitle={total ? t('vocab.saved.count', { n: total }) : undefined} onBack={() => router.back()} />} edges={['bottom']} keyboardAvoiding>
      {body}
    </Screen>
  );
}
