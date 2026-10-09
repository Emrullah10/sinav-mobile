import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { Text } from './Text';

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: OctagonAlert };

/** Banner. tone: info|success|warning|danger · title (isteğe bağlı) · message · onClose (kapatılabilir) · action: { label, onPress }. */
export function Banner({ tone = 'info', title, message, onClose, action, style }) {
  const { colors, radius } = useTheme();
  const { t } = useT();
  const pal = {
    info: {
      bg: colors.accent['subtle-bg'],
      fg: colors.accent['subtle-fg'],
      border: colors.accent.default,
    },
    success: { bg: colors.success.bg, fg: colors.success.fg, border: colors.success.border },
    warning: { bg: colors.warning.bg, fg: colors.warning.fg, border: colors.warning.border },
    danger: { bg: colors.danger.bg, fg: colors.danger.fg, border: colors.danger.border },
  }[tone];
  const Icon = ICONS[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={[
        {
          flexDirection: 'row',
          gap: 12,
          padding: 12,
          borderRadius: radius.md,
          backgroundColor: pal.bg,
          borderWidth: 1,
          borderColor: pal.border,
        },
        style,
      ]}
    >
      <Icon size={20} color={pal.fg} strokeWidth={1.75} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 4 }}>
        {title ? (
          <Text variant="label-l" style={{ color: pal.fg }}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text variant="body-s" color="primary">
            {message}
          </Text>
        ) : null}
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            hitSlop={8}
            style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <Text variant="label-m" style={{ color: pal.fg, textDecorationLine: 'underline' }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
          hitSlop={12}
        >
          <X size={18} color={pal.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}
