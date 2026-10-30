import { useId, useMemo } from 'react';
import { Text as Span } from 'react-native';
import { Text, useToast } from '@components';
import { looksEnglish, sentenceWindow, splitSentences, tokenize } from '@shared/vendor/domain/lexicon-text.js';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { useLexicon } from './LexiconProvider';

const BOLD = { fontWeight: '700' };
// İç parçalar düz RN Text (Span): yazı tipi/boyut/renk dıştaki temalı Text'ten miras alınır.

/** Paragraf parçalarını kelime/cümle parçalarına ayırır; çeviri isteğine yalnız İngilizce cümleler (sırayla) gider. */
const parseRuns = (parts, lang) => {
  const full = parts.map((r) => r.text).join('');
  const list = splitSentences(full);
  const english = list.map((s) => lang === 'en' || looksEnglish(s.text));
  const pieces = [];
  let offset = 0;
  for (const r of parts) {
    pieces.push({ bold: r.bold, tokens: tokenize(r.text, { sentences: list, offset }).tokens });
    offset += r.text.length;
  }
  const enList = [];
  const enIndex = list.map((s, i) => (english[i] ? enList.push(s.text) - 1 : -1));
  return { english, pieces, enList, enIndex };
};

/**
 * Dokunulabilir metin: kelimeye dokun → sözlük, basılı tut → cümle çevirisi.
 * text | runs ([{ text, bold }]: biçimli paragraf; cümleler bütün paragraftan hesaplanır).
 * lang: 'en' (içerik metni; her cümle İngilizce) | 'auto' (karışık: yalnız İngilizce görünen cümleler dokunulur).
 * words / sentences: kelime ve cümle çevirisi açık mı. sentences kapalıyken basılı tutunca `sentenceLock` (i18n anahtarı) gösterilir.
 * onAsk(metin): "Öğretmene sor" bunu çağırır (sohbet ekranında aynı sohbete gönderir).
 * Diğer özellikler (variant, color, style, …) dış Text'e gider.
 */
export function TapText({ text, runs, lang = 'en', words = true, sentences = true, sentenceLock, onAsk, ...rest }) {
  const lex = useLexicon();
  const owner = useId();
  const { colors } = useTheme();
  const { t } = useT();
  const toast = useToast();
  const haptics = useHaptics();
  const parts = useMemo(() => runs || [{ text: String(text ?? '') }], [runs, text]);

  const parsed = useMemo(() => parseRuns(parts, lang), [parts, lang]);

  const enabled = lex && (words || sentences || sentenceLock);
  if (!enabled) {
    return <Text {...rest}>{parts.map((r) => r.text).join('')}</Text>;
  }

  const active = lex.active?.owner === owner ? lex.active : null;
  const payload = (si) => {
    const w = parsed.enIndex[si] >= 0 ? sentenceWindow(parsed.enList, parsed.enIndex[si]) : null;
    return w ? { sentences: w.sentences, index: w.index } : { sentences: null, index: -1 };
  };
  const openWord = (key, tok) => {
    haptics.select();
    lex.open({ kind: 'word', word: tok.text, owner, token: key, sentence: tok.sentence, ...payload(tok.sentence), allowSentence: sentences, onAsk });
  };
  const openSentence = (tok) => {
    if (!sentences) {
      if (sentenceLock) toast.show({ message: t(sentenceLock) });
      return;
    }
    const p = payload(tok.sentence);
    if (!p.sentences) {
      toast.show({ message: t('lex.sentence.tooLong') });
      return;
    }
    haptics.soft();
    lex.open({ kind: 'sentence', owner, sentence: tok.sentence, ...p, onAsk });
  };

  const renderTokens = (tokens, prefix) =>
    tokens.map((tok, i) => {
      const key = `${prefix}.${i}`;
      const en = tok.sentence >= 0 && parsed.english[tok.sentence];
      const hl =
        active?.kind === 'word' && active.token === key
          ? { backgroundColor: colors.accent['subtle-bg'], color: colors.accent['subtle-fg'] }
          : active?.kind === 'sentence' && active.sentence === tok.sentence
            ? { backgroundColor: colors.bg.selected }
            : null;
      if (!tok.word || !en) return hl ? <Span key={key} style={hl}>{tok.text}</Span> : tok.text;
      return (
        <Span
          key={key}
          suppressHighlighting
          onPress={words ? () => openWord(key, tok) : undefined}
          onLongPress={() => openSentence(tok)}
          style={hl}
        >
          {tok.text}
        </Span>
      );
    });

  return (
    <Text accessibilityHint={t('lex.a11yHint')} {...rest}>
      {parsed.pieces.map((p, r) =>
        p.bold ? (
          <Span key={r} style={BOLD}>
            {renderTokens(p.tokens, r)}
          </Span>
        ) : (
          renderTokens(p.tokens, r)
        ),
      )}
    </Text>
  );
}
