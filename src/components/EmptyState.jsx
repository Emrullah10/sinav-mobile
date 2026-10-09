import { Inbox } from 'lucide-react-native';
import { View } from 'react-native';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Button } from './Button';
import { Text } from './Text';

/** Boş durum: ikon, başlık, açıklama (ne olacak/nasıl başlanır), isteğe bağlı eylem. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  style,
}) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View accessible style={[{ alignItems: 'center', padding: 24, gap: 12 }, style]}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.accent['subtle-bg'],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={32} color={colors.accent['subtle-fg']} strokeWidth={1.5} />
      </View>
      <Text variant="heading-3" align="center">
        {title ?? t('state.empty.title')}
      </Text>
      {description ? (
        <Text variant="body-m" color="secondary" align="center">
          {description}
        </Text>
      ) : null}
      {actionLabel ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="md"
          fullWidth={false}
          style={{ alignSelf: 'center', marginTop: 8 }}
        />
      ) : null}
    </View>
  );
}
