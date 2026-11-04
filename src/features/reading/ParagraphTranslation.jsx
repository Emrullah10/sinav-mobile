import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, X } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, IconButton, Skeleton, Text } from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, unwrap } from '@shared/api/helpers';
import { useT } from '@shared/translation/useT';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { normalizeSentence, translateParagraph } from '@shared/vendor/domain/lexicon-text.js';
import { useTheme } from '@theme';

/** Paragrafın altında açılan Türkçesi. Cümle çevirisiyle aynı uç ve önbellek: basılı tutulan cümle yeniden istek atmaz. */
export function ParagraphTranslation({ text, lang, bookCode, onClose }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['content', 'paragraphTranslation', String(bookCode), normalizeSentence(text)],
    queryFn: () =>
      translateParagraph(
        text,
        async (sentences, index) => {
          const r = unwrap(await api.contentLexiconSentence(sentences, index, bookCode));
          for (const x of r.translations) qc.setQueryData(queryKeys.content.lexiconSentence(normalizeSentence(sentences[x.index])), x.text);
          return r;
        },
        { lang },
      ),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
  const fg = colors.accent['subtle-fg'];
  const parts = q.data || [];
  return (
    <View accessibilityLiveRegion="polite" style={{ marginTop: 8, padding: 12, gap: 6, borderRadius: radius.md, backgroundColor: colors.accent['subtle-bg'] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Languages size={14} color={fg} />
          <Text variant="overline" style={{ color: fg }}>{t('read.reader.translation')}</Text>
        </View>
        <IconButton icon={X} size={32} accessibilityLabel={t('read.reader.hide')} onPress={onClose} />
      </View>
      {q.isPending ? (
        <View style={{ gap: 8 }} accessibilityLabel={t('lex.translating')}>
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
        </View>
      ) : q.isError ? (
        <View style={{ gap: 8 }}>
          <Text variant="body-s" color="danger">{errorText(t, q.error)}</Text>
          {apiErrorCode(q.error) !== 'CONTENT_LEXICON_LIMIT' ? (
            <Button title={t('lex.retry')} variant="secondary" size="sm" fullWidth={false} onPress={() => q.refetch()} />
          ) : null}
        </View>
      ) : (
        <>
          <Text variant="body-m" selectable style={{ color: fg }}>{parts.map((p) => p.translation || p.text).join(' ')}</Text>
          {parts.some((p) => !p.translation) ? <Text variant="caption" style={{ color: fg }}>{t('read.reader.partial')}</Text> : null}
        </>
      )}
    </View>
  );
}
