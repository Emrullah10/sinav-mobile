import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Library } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Button, Card, ProgressBar, Text } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';
import { BookCover } from './BookCover';

/** Çalış ve Bugün girişi. compact: yalnız yarım kalan kitap varsa görünür (Bugün). */
export function ContinueCard({ compact = false }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const q = useQuery({
    queryKey: queryKeys.content.readingLibrary(),
    queryFn: async () => unwrap(await api.contentReadingLibrary()),
  });
  const book = q.data?.continue?.[0];
  if (q.isPending || q.isError || (compact && !book)) return null;
  if (!book) {
    return (
      <Card elevation="e1" onPress={() => router.push(deepLinks.library)} accessibilityLabel={t('read.card.title')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Library size={28} color={colors.accent.default} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{t('read.card.title')}</Text>
          <Text variant="body-s" color="secondary">{t('read.card.body')}</Text>
        </View>
      </Card>
    );
  }
  const percent = Math.round(book.progress?.percent || 0);
  return (
    <Card elevation="e1" style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('read.continue.title')}: ${book.title}`}
        onPress={() => router.push(deepLinks.reader(book.code))}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
      >
        <BookCover book={book} width={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.accent['subtle-bg'] }}>
            <Text variant="overline" style={{ color: colors.accent['subtle-fg'] }}>{t('read.continue.title')}</Text>
          </View>
          <Text variant="reading-m" numberOfLines={2}>{book.title}</Text>
          <Text variant="body-s" color="secondary">
            {t('read.continue.line', { section: (book.progress?.sectionPosition || 0) + 1, percent })}
          </Text>
          <ProgressBar value={percent / 100} height={4} />
        </View>
      </Pressable>
      {compact ? null : (
        <View style={{ alignItems: 'flex-end' }}>
          <Button title={t('read.card.open')} variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push(deepLinks.library)} />
        </View>
      )}
    </Card>
  );
}
