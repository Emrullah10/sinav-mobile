import { FileQuestion, Lock, ServerCrash, WifiOff } from 'lucide-react-native';
import { View } from 'react-native';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Button } from './Button';
import { Text } from './Text';

const KINDS = { network: WifiOff, server: ServerCrash, permission: Lock, notFound: FileQuestion };

/** Hata durumu: ne oldu, ne yapılır, tekrar dene. kind: network|server|permission|notFound. title/description ezilebilir. */
export function ErrorState({ kind = 'server', title, description, onRetry, retryLabel, style }) {
  const { colors } = useTheme();
  const { t } = useT();
  const Icon = KINDS[kind] || ServerCrash;
  return (
    <View
      accessible
      accessibilityRole="alert"
      style={[{ alignItems: 'center', padding: 24, gap: 12 }, style]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.danger.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={32} color={colors.danger.fg} strokeWidth={1.5} />
      </View>
      <Text variant="heading-3" align="center">
        {title ?? t(`state.error.${kind}.title`)}
      </Text>
      <Text variant="body-m" color="secondary" align="center">
        {description ?? t(`state.error.${kind}.body`)}
      </Text>
      {onRetry ? (
        <Button
          title={retryLabel ?? t('common.retry')}
          onPress={onRetry}
          size="md"
          variant="secondary"
          fullWidth={false}
          style={{ alignSelf: 'center', marginTop: 8 }}
        />
      ) : null}
    </View>
  );
}
