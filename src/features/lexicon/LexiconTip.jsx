import { Hand, MousePointerClick } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Text } from '@components';
import { useUiStore } from '@store/uiStore';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

function TipRow({ icon: Icon, text }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Icon size={18} color={colors.accent.default} style={{ marginTop: 2 }} />
      <Text variant="body-m" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

/** Dokun-çevir ipucu: ilk okuma ekranında bir kez gösterilir ("Anladım" ile kalıcı kapanır). */
export function LexiconTip() {
  const { t } = useT();
  const { colors } = useTheme();
  const seen = useUiStore((s) => s.lexiconTipSeen);
  const setSeen = useUiStore((s) => s.setLexiconTipSeen);
  if (seen) return null;
  return (
    <Card style={{ gap: 10, backgroundColor: colors.accent['subtle-bg'], borderColor: colors.accent['subtle-bg'] }}>
      <Text variant="title" accessibilityRole="header">{t('lex.tip.title')}</Text>
      <TipRow icon={MousePointerClick} text={t('lex.tip.word')} />
      <TipRow icon={Hand} text={t('lex.tip.sentence')} />
      <Button title={t('lex.tip.ok')} variant="secondary" size="md" fullWidth={false} onPress={() => setSeen(true)} />
    </Card>
  );
}
