import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Card, ListRow, Markdown, QueryBoundary, Screen, Text, TopBar } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { deepLinks } from '@shared/navigation/deepLinks';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { ContactCard } from '@features/help/HelpParts';

/** Tek yardım makalesi (istek dilinde) + ilgili makaleler + "Bize yaz". */
export default function HelpArticle() {
  const { slug } = useLocalSearchParams();
  const { t } = useT();
  const query = useQuery({
    queryKey: queryKeys.content.article('help', slug),
    queryFn: async () => unwrap(await api.contentPublicArticleGet('help', slug)),
  });
  return (
    <Screen
      header={
        <TopBar
          title={t('help.title')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(deepLinks.help))}
        />
      }
      edges={['bottom']}
    >
      <QueryBoundary query={query}>
        {(a) => (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 6 }}>
              {a.category?.name ? (
                <Text variant="label-m" color="accent">
                  {a.category.name}
                </Text>
              ) : null}
              <Text variant="heading-1" accessibilityRole="header">
                {a.title}
              </Text>
            </View>
            <Markdown source={a.bodyMd} />
            {a.related?.length ? (
              <View style={{ gap: 8 }}>
                <Text variant="heading-3" accessibilityRole="header">
                  {t('help.related')}
                </Text>
                <Card padded={false} style={{ paddingHorizontal: 16 }}>
                  {a.related.map((r, i) => (
                    <ListRow
                      key={r.code}
                      title={r.title}
                      onPress={() => router.push(deepLinks.helpArticle(r.slug))}
                      divider={i < a.related.length - 1}
                    />
                  ))}
                </Card>
              </View>
            ) : null}
            <ContactCard categoryKey={a.category?.key} />
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
