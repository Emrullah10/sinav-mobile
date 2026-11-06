import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Text as Span, View } from 'react-native';
import { Button, Card, Text } from '@components';
import { deepLinks } from '@shared/navigation/deepLinks';
import { searchSnippetParts } from '@shared/vendor/domain/index.js';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

// Yardım kategorisi → iletişim formu konusu (destek ekranı bununla açılır).
const TOPIC_BY_CATEGORY = {
  hesap: 'account',
  odeme: 'payment',
  plan: 'plan',
  ogretmen: 'tutor',
  'sinav-bilgisi': 'exam_info',
};

/** "Aradığını bulamadın mı? → Bize yaz": iletişim formuna, varsa kategoriye uygun konuyla. */
export function ContactCard({ categoryKey }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const topic = TOPIC_BY_CATEGORY[categoryKey];
  return (
    <Card style={{ gap: 12 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          backgroundColor: colors.accent['subtle-bg'],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MessageCircle size={22} color={colors.accent.default} />
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="heading-3">{t('help.contactTitle')}</Text>
        <Text variant="body-m" color="secondary">
          {t('help.contactBody')}
        </Text>
      </View>
      <Button
        title={t('help.contactCta')}
        variant="secondary"
        size="md"
        onPress={() =>
          router.push(
            topic ? { pathname: deepLinks.support, params: { topic } } : deepLinks.support,
          )
        }
      />
    </Card>
  );
}

/** Arama sonucu özeti (ListRow alt satırının Text'i içinde): eşleşen kelimeler vurgulu, metin HTML olarak işlenmez. */
export function Snippet({ text }) {
  const { colors } = useTheme();
  return (
    <>
      {searchSnippetParts(text).map((p, i) =>
        p.hit ? (
          <Span
            key={i}
            style={{
              backgroundColor: colors.accent['subtle-bg'],
              color: colors.accent['subtle-fg'],
            }}
          >
            {p.text}
          </Span>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
