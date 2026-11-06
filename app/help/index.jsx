import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Card,
  EmptyState,
  ListRow,
  QueryBoundary,
  Screen,
  Text,
  TextField,
  TopBar,
} from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { ContactCard, Snippet } from '@features/help/HelpParts';

/** Yardım merkezi: kategorilere göre makaleler + arama (en az 2 harf, 300 ms bekleyerek). Giriş gerekmez. */
export default function HelpCenter() {
  const { t } = useT();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);
  const searching = q.length >= 2;
  const center = useQuery({
    queryKey: queryKeys.content.articles({ type: 'help', grouped: true }),
    queryFn: async () => {
      const [cats, list] = await Promise.all([
        api.contentPublicArticleCategoriesList({ type: 'help' }),
        api.contentPublicArticlesList({ type: 'help', pageSize: 100 }),
      ]);
      const items = unwrap(list)?.items || [];
      return (unwrap(cats)?.items || [])
        .map((c) => ({ ...c, items: items.filter((a) => a.category?.key === c.key) }))
        .filter((g) => g.items.length);
    },
  });
  const found = useQuery({
    queryKey: queryKeys.content.articleSearch({ type: 'help', q }),
    queryFn: async () =>
      unwrap(await api.contentPublicArticlesSearch({ q, type: 'help', limit: 20 })),
    enabled: searching,
  });
  const open = (slug) => router.push(deepLinks.helpArticle(slug));
  const rows = (items, withSnippet) => (
    <Card padded={false} style={{ paddingHorizontal: 16 }}>
      {items.map((a, i) => (
        <ListRow
          key={a.code}
          title={a.title}
          subtitle={withSnippet ? <Snippet text={a.snippet} /> : undefined}
          accessibilityLabel={a.title}
          onPress={() => open(a.slug)}
          divider={i < items.length - 1}
        />
      ))}
    </Card>
  );

  return (
    <Screen
      header={
        <TopBar
          title={t('help.title')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      }
      edges={['bottom']}
    >
      <View style={{ gap: 20 }}>
        <Text variant="body-l" color="secondary">
          {t('help.subtitle')}
        </Text>
        <TextField
          label={t('help.searchLabel')}
          placeholder={t('help.searchPlaceholder')}
          value={text}
          onChangeText={setText}
          leading={<Search size={18} color={colors.text.tertiary} />}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {searching ? (
          <View accessibilityLiveRegion="polite">
            <QueryBoundary query={found}>
              {(d) =>
                d.items.length ? (
                  rows(d.items, true)
                ) : (
                  <Text variant="body-m" color="secondary">
                    {t('help.noResults', { q })}
                  </Text>
                )
              }
            </QueryBoundary>
          </View>
        ) : (
          <QueryBoundary query={center}>
            {(groups) =>
              groups.length ? (
                <View style={{ gap: 20 }}>
                  {groups.map((g) => (
                    <View key={g.key} style={{ gap: 8 }}>
                      <Text variant="heading-3" accessibilityRole="header">
                        {g.name}
                      </Text>
                      {rows(g.items, false)}
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState title={t('help.empty')} />
              )
            }
          </QueryBoundary>
        )}
        <ContactCard />
      </View>
    </Screen>
  );
}
