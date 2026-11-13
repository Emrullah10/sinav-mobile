import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Text } from '@components';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useLexicon } from '../lexicon/LexiconProvider';

/** Oyun sonu: bilemediğin kelimeler. Dokununca dokun-çevir sayfası; tek dokunuşla Kelimelerim'e (SRS) eklenir. */
export function WordsToLearn({ words }) {
  const { t } = useT();
  const lex = useLexicon();
  const qc = useQueryClient();
  const haptics = useHaptics();
  const [added, setAdded] = useState(() => new Set());
  const add = useMutation({
    mutationFn: async (word) => {
      const { itemCode } = unwrap(await api.contentLexiconWordItem(word));
      await api.learningVocabCardAdd(itemCode);
      return word;
    },
    onSuccess: (word) => {
      haptics.success();
      setAdded((s) => new Set(s).add(word));
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabOverview() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.vocabMyWords() });
      qc.invalidateQueries({ queryKey: queryKeys.learning.today() });
    },
  });
  if (!words?.length) return null;
  const todo = words.filter((w) => !added.has(w.word));
  const addAll = async () => { for (const w of todo) { try { await add.mutateAsync(w.word); } catch { break; } } };
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title">{t('games.learn.title')}</Text>
        {todo.length > 1 ? <Button size="sm" variant="tertiary" disabled={add.isPending} onPress={addAll}>{t('games.learn.addAll')}</Button> : null}
      </View>
      {words.map((w) => {
        const done = added.has(w.word);
        return (
          <View key={w.word} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44 }}>
            <Pressable style={{ flex: 1, minHeight: 44, justifyContent: 'center' }} accessibilityRole="button" onPress={() => lex?.open({ kind: 'word', word: w.word })}>
              <Text variant="body-m"><Text variant="label-m">{w.word}</Text>{w.tr ? ` · ${w.tr}` : ''}</Text>
            </Pressable>
            <Button size="sm" variant={done ? 'tertiary' : 'secondary'} disabled={done || add.isPending} startIcon={done ? <Check size={16} /> : <Plus size={16} />} onPress={() => add.mutate(w.word)}>
              {done ? t('games.learn.added') : t('games.learn.add')}
            </Button>
          </View>
        );
      })}
    </View>
  );
}
