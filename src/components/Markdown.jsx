import { View } from 'react-native';
import { Text } from './Text';

// Yasal metinler için küçük Markdown çözümleyici: # başlıklar, - / 1. listeler, **kalın**, paragraflar.
// Ham HTML ve bağlantı çalıştırılmaz (yalnız düz metin gösterilir).
const HEADINGS = { 1: 'heading-1', 2: 'heading-2', 3: 'heading-3' };

const inline = (text) =>
  String(text)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .split('**');

function Line({ text, variant = 'body-m', style }) {
  const parts = inline(text);
  return (
    <Text variant={variant} style={style}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Text key={i} variant={variant} style={{ fontWeight: '700' }}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export function Markdown({ source }) {
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };
  String(source || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line) flush();
      else if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
        flush();
        blocks.push({ type: 'h', level: m[1].length, text: m[2] });
      } else if ((m = /^[-*]\s+(.*)$/.exec(line))) {
        flush();
        blocks.push({ type: 'li', mark: '•', text: m[1] });
      } else if ((m = /^(\d+)[.)]\s+(.*)$/.exec(line))) {
        flush();
        blocks.push({ type: 'li', mark: `${m[1]}.`, text: m[2] });
      } else para.push(line);
    });
  flush();
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((b, i) =>
        b.type === 'h' ? (
          <Line key={i} text={b.text} variant={HEADINGS[b.level]} style={{ marginTop: 6 }} />
        ) : b.type === 'li' ? (
          <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
            <Text variant="body-m">{b.mark}</Text>
            <View style={{ flex: 1 }}>
              <Line text={b.text} />
            </View>
          </View>
        ) : (
          <Line key={i} text={b.text} />
        ),
      )}
    </View>
  );
}
