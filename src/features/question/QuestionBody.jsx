import { Pressable, View } from 'react-native';
import { Card, OptionBubble, Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

/** Basit biçim temizliği: gövdelerde markdown vurgusu varsa işaretleri at. */
export const plain = (s) => (s == null ? '' : String(s).replace(/\*\*|__/g, ''));

/** Okuma metni kartı (varsa). */
export function PassageCard({ passage }) {
  const { t } = useT();
  if (!passage) return null;
  return (
    <Card style={{ gap: 8 }}>
      {passage.title ? (
        <Text variant="title" accessibilityRole="header">
          {passage.title}
        </Text>
      ) : null}
      <Text variant="reading-m">{plain(passage.body)}</Text>
      {passage.terms?.length ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          <Text variant="overline" color="tertiary">
            {t('question.terms')}
          </Text>
          {passage.terms.map((term) => (
            <Text key={term.term} variant="body-s" color="secondary">
              {`${term.term} — ${term.definitionTr}`}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Soru gövdesi + şıklar.
 * optionStates: { A: 'correct'|'wrong'|'blank' } geri bildirimde; eliminated: elenen etiketler;
 * disabled: dokunulamaz; selectedLabel: seçili şık.
 */
export function QuestionBody({
  question,
  passage,
  selectedLabel,
  onSelect,
  optionStates = {},
  eliminated = [],
  disabled = false,
  showPassage = true,
}) {
  const { colors, radius } = useTheme();
  const { t } = useT();
  if (!question) return null;
  return (
    <View style={{ gap: 16 }}>
      {showPassage ? <PassageCard passage={passage} /> : null}
      {question.questionType?.name ? (
        <Text variant="overline" color="tertiary">
          {question.questionType.name}
        </Text>
      ) : null}
      <Text variant="reading-l" accessibilityRole="header">
        {plain(question.stem)}
      </Text>
      <View style={{ gap: 8 }}>
        {(question.options || []).map((opt) => {
          const feedback = optionStates[opt.label];
          const isEliminated = eliminated.includes(opt.label);
          const selected = selectedLabel === opt.label;
          const state = feedback || (isEliminated ? 'disabled' : selected ? 'selected' : 'default');
          const border =
            feedback === 'correct'
              ? colors.success.fg
              : feedback === 'wrong'
                ? colors.danger.fg
                : selected
                  ? colors.accent.default
                  : colors.border.default;
          const bg =
            feedback === 'correct'
              ? colors.success.bg
              : feedback === 'wrong'
                ? colors.danger.bg
                : selected
                  ? colors.bg.selected
                  : colors.bg.surface;
          return (
            <Pressable
              key={opt.label}
              disabled={disabled || isEliminated}
              onPress={() => onSelect?.(opt.label)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: disabled || isEliminated }}
              accessibilityLabel={`${opt.label}. ${plain(opt.text)}${
                feedback === 'correct'
                  ? `, ${t('question.correct')}`
                  : feedback === 'wrong'
                    ? `, ${t('question.wrong')}`
                    : ''
              }`}
              style={{
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: radius.md,
                borderWidth: selected || feedback ? 2 : 1,
                borderColor: border,
                backgroundColor: bg,
              }}
            >
              <OptionBubble letter={opt.label} state={state} />
              <Text
                variant="body-l"
                color={isEliminated ? 'disabled' : undefined}
                style={[{ flex: 1 }, isEliminated ? { textDecorationLine: 'line-through' } : null]}
              >
                {plain(opt.text)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
