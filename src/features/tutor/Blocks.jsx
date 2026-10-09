import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Banner, Card, OptionBubble, Text } from '@components';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

function MiniQuestion({ block }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const [picked, setPicked] = useState(null);
  const done = picked != null;
  return (
    <Card style={{ gap: 8 }}>
      <Text variant="reading-m">{block.stem}</Text>
      {block.options.map((o) => {
        const state = !done
          ? 'default'
          : o.label === block.answerLabel
            ? 'correct'
            : o.label === picked
              ? 'wrong'
              : 'default';
        return (
          <Pressable
            key={o.label}
            disabled={done}
            onPress={() => setPicked(o.label)}
            accessibilityRole="button"
            accessibilityLabel={`${o.label}. ${o.text}`}
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 10,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border.default,
            }}
          >
            <OptionBubble letter={o.label} state={state} />
            <Text variant="body-m" style={{ flex: 1 }}>{o.text}</Text>
          </Pressable>
        );
      })}
      {done && block.explanation ? (
        <Banner
          tone={picked === block.answerLabel ? 'success' : 'info'}
          title={block.answerLabel ? t('tutor.block.answer', { label: block.answerLabel }) : undefined}
          message={block.explanation}
        />
      ) : null}
    </Card>
  );
}

function SentenceXray({ block }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  return (
    <Card style={{ gap: 8 }}>
      <Text variant="overline" color="tertiary">{t('tutor.block.xray')}</Text>
      <Text variant="reading-m">{block.sentence}</Text>
      {block.parts?.map((p) => (
        <View
          key={p.no}
          style={{
            gap: 2,
            padding: 8,
            borderRadius: radius.md,
            backgroundColor: p.main ? colors.accent['subtle-bg'] : colors.bg.canvas,
          }}
        >
          <Text variant="label-m">{`${p.no}. ${p.text}`}</Text>
          <Text variant="body-s" color="secondary">
            {[p.role, p.function, p.main ? t('tutor.block.main') : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}
      {block.skeleton ? <Text variant="body-s" color="secondary">{`${t('tutor.block.skeleton')}: ${block.skeleton}`}</Text> : null}
      {block.translation ? <Text variant="body-m" italic>{block.translation}</Text> : null}
    </Card>
  );
}

function TableBlock({ block }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 6 }} padded>
      {block.title ? <Text variant="label-m">{block.title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row' }}>
            {block.columns.map((c, i) => (
              <Text key={i} variant="label-s" color="secondary" style={{ minWidth: 110, paddingRight: 12, paddingBottom: 4 }}>{c}</Text>
            ))}
          </View>
          {block.rows.map((r, ri) => (
            <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border.subtle, paddingVertical: 6 }}>
              {r.map((cell, ci) => (
                <Text key={ci} variant="body-s" style={{ minWidth: 110, paddingRight: 12 }}>{String(cell)}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

/** Asistan yanıtının yapılandırılmış blokları (mini soru, cümle röntgeni, tablo). */
export function Blocks({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((b, i) => {
        if (b.type === 'mini_question') return <MiniQuestion key={i} block={b} />;
        if (b.type === 'sentence_xray') return <SentenceXray key={i} block={b} />;
        if (b.type === 'table') return <TableBlock key={i} block={b} />;
        return null;
      })}
    </View>
  );
}
