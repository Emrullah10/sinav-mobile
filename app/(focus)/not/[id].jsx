import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, IconButton, ListRow, QueryBoundary, Screen, Text, TopBar, useToast } from '@components';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { deepLinks } from '@shared/navigation/deepLinks';
import { plain } from '@features/question/QuestionBody';
import { useHeartbeat } from '@hooks/useHeartbeat';
import { useT } from '@shared/translation/useT';

export default function NoteScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.content.note(id),
    queryFn: async () => unwrap(await api.contentNoteGet(id)),
  });
  const note = query.data;
  useHeartbeat(null, Boolean(note && !note.locked));

  const marked = useRef(false);
  const read = useMutation({
    mutationFn: async (understood) => unwrap(await api.learningNoteRead(id, understood)),
    onSuccess: (res, understood) => {
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
      if (understood) toast.show({ message: t('note.markedRead'), tone: 'success' });
      return res;
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  useEffect(() => {
    if (note && !note.locked && !marked.current) {
      marked.current = true;
      read.mutate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const check = useMutation({
    mutationFn: async () => unwrap(await api.learningNoteCheckStart(id)),
    onSuccess: (res) => router.replace(deepLinks.question(res.code)),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const bookmark = useMutation({
    mutationFn: async () => unwrap(await api.learningBookmarkCreate({ itemCode: id })),
    onSuccess: () => toast.show({ message: t('note.bookmarked'), tone: 'success' }),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const ask = useMutation({
    mutationFn: async () => unwrap(await api.tutorConversationCreate({ mode: 'explain', context: { kind: 'note', itemCode: String(id) } })),
    onSuccess: (conv) => router.push(`/ogretmen/${conv.code}`),
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });

  return (
    <Screen
      header={
        <TopBar
          title={t('note.title')}
          onBack={() => router.back()}
          right={<IconButton icon={Bookmark} accessibilityLabel={t('note.bookmark')} onPress={() => bookmark.mutate()} />}
        />
      }
      edges={['bottom']}
      footer={
        note && !note.locked ? (
          <View style={{ gap: 8 }}>
            {note.checkQuestions?.length ? (
              <Button title={t('note.check')} loading={check.isPending} onPress={() => check.mutate()} />
            ) : null}
            <Button title={t('note.understood')} variant="secondary" loading={read.isPending && read.variables === true} onPress={() => read.mutate(true)} />
          </View>
        ) : null
      }
    >
      <QueryBoundary query={query}>
        {(n) => (
          <View style={{ gap: 16 }}>
            <Text variant="heading-1" accessibilityRole="header">{n.title}</Text>
            <Text variant="caption" color="tertiary">{t('note.readingTime', { n: n.readingSeconds })}</Text>
            {n.locked ? (
              <Banner tone="info" message={t('note.locked')} action={{ label: t('today.access.upgrade'), onPress: () => router.push('/premium') }} />
            ) : (
              <>
                {n.summary ? <Text variant="body-l" color="secondary">{plain(n.summary)}</Text> : null}
                {n.ruleMd ? (
                  <Card style={{ gap: 6 }}>
                    <Text variant="overline" color="tertiary">{t('note.rule')}</Text>
                    <Text variant="reading-m">{plain(n.ruleMd)}</Text>
                  </Card>
                ) : null}
                {n.examples?.length ? (
                  <View style={{ gap: 8 }}>
                    <Text variant="heading-3">{t('note.examples')}</Text>
                    {n.examples.map((ex, i) => (
                      <View key={i}>
                        <Text variant="reading-m" italic>{ex.en}</Text>
                        <Text variant="body-s" color="secondary">{ex.tr}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {n.trapMd ? (
                  <Banner tone="warning" title={t('note.trap')} message={plain(n.trapMd)} />
                ) : null}
                <Button title={t('note.askTutor')} variant="tertiary" size="md" fullWidth={false} loading={ask.isPending} onPress={() => ask.mutate()} />
                {n.relatedSkills?.length ? (
                  <View>
                    <Text variant="heading-3" style={{ marginBottom: 4 }}>{t('note.related')}</Text>
                    {n.relatedSkills.map((s) => (
                      <ListRow key={s.key} title={s.name} onPress={() => router.push(`/calis/beceri/${s.key}`)} />
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
