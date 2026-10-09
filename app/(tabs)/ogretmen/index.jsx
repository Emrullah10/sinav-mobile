import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, MessageSquarePlus, MoreVertical, Pin } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  Banner, Button, Card, EmptyState, IconButton, ListRow, QueryBoundary, Screen, Sheet, Text, TopBar, useToast,
} from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, formatDate, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

export default function TutorHome() {
  const { t, language } = useT();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const sheet = useRef(null);
  const [selected, setSelected] = useState(null);

  const query = useQuery({
    queryKey: queryKeys.tutor.overview(),
    queryFn: async () => unwrap(await api.tutorOverviewGet({ limit: 50 })),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.tutor.overview() });

  const create = useMutation({
    mutationFn: async (starter) => ({
      conv: unwrap(await api.tutorConversationCreate(starter ? { mode: starter.mode } : {})),
      starter,
    }),
    onSuccess: ({ conv, starter }) => {
      refresh();
      router.push({ pathname: `/ogretmen/${conv.code}`, params: starter ? { starter: starter.text } : {} });
    },
    onError: (e) =>
      toast.show({
        message: apiErrorCode(e) === 'PERMISSION_DENIED' ? t('apiErrors.PERMISSION_DENIED') : errorText(t, e),
        tone: 'danger',
      }),
  });
  const patch = useMutation({
    mutationFn: async ({ code, body }) => unwrap(await api.tutorConversationUpdate(code, body)),
    onSuccess: () => {
      refresh();
      sheet.current?.dismiss();
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const remove = useMutation({
    mutationFn: async (code) => unwrap(await api.tutorConversationDelete(code)),
    onSuccess: () => {
      refresh();
      sheet.current?.dismiss();
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });

  return (
    <Screen
      header={
        <TopBar
          variant="large"
          title={t('tutor.title')}
          right={<IconButton icon={MessageSquarePlus} accessibilityLabel={t('tutor.new')} onPress={() => create.mutate(null)} />}
        />
      }
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching && !query.isPending}
    >
      <QueryBoundary query={query}>
        {(d) => (
          <View style={{ gap: 16 }}>
            {!d.llmAvailable ? <Banner tone="warning" message={t('tutor.unavailable')} /> : null}
            <Text variant="body-s" color="secondary">
              {d.usage?.limit == null ? t('tutor.usageUnlimited') : t('tutor.usage', { n: d.usage.remaining })}
            </Text>
            <Button title={t('tutor.new')} onPress={() => create.mutate(null)} loading={create.isPending && !create.variables} disabled={!d.llmAvailable} />
            <Card onPress={() => router.push('/ogretmen/ceviri')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={t('tutor.translation')}>
              <Languages size={24} color={colors.accent.default} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{t('tutor.translation')}</Text>
                <Text variant="body-s" color="secondary">{t('tutor.translationHint')}</Text>
              </View>
            </Card>
            {d.starters?.length ? (
              <View style={{ gap: 8 }}>
                <Text variant="heading-3">{t('tutor.starters')}</Text>
                {d.starters.slice(0, 5).map((s) => (
                  <Card key={s.code} onPress={() => create.mutate(s)} accessibilityLabel={s.text}>
                    <Text variant="body-m">{s.text}</Text>
                  </Card>
                ))}
              </View>
            ) : null}
            <View>
              <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('tutor.recent')}</Text>
              {d.conversations.length === 0 ? (
                <EmptyState title={t('tutor.empty')} />
              ) : (
                d.conversations.map((c, i) => (
                  <ListRow
                    key={c.code}
                    title={c.title}
                    subtitle={c.lastMessagePreview || undefined}
                    leading={c.pinned ? <Pin size={18} color={colors.accent.default} /> : null}
                    value={c.lastMessageAt ? formatDate(c.lastMessageAt, language, { day: 'numeric', month: 'short' }) : undefined}
                    divider={i < d.conversations.length - 1}
                    onPress={() => router.push(`/ogretmen/${c.code}`)}
                    trailing={
                      <IconButton
                        icon={MoreVertical}
                        size={36}
                        accessibilityLabel={t('tutor.recent')}
                        onPress={() => {
                          setSelected(c);
                          sheet.current?.present();
                        }}
                      />
                    }
                  />
                ))
              )}
            </View>
          </View>
        )}
      </QueryBoundary>
      <Sheet ref={sheet} title={selected?.title}>
        {selected ? (
          <View>
            <ListRow
              title={selected.pinned ? t('tutor.unpin') : t('tutor.pin')}
              onPress={() => patch.mutate({ code: selected.code, body: { pinned: !selected.pinned } })}
              divider
            />
            <ListRow
              title={t('tutor.delete')}
              onPress={() =>
                Alert.alert(t('tutor.delete'), t('tutor.delete.confirm'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('tutor.delete'), style: 'destructive', onPress: () => remove.mutate(selected.code) },
                ])
              }
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
