import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme';
import { Text } from './Text';

const ToastContext = createContext({ show: () => {}, hide: () => {} });

/**
 * Toast sağlayıcısı (kök düzende). useToast().show({ message, tone?: 'info'|'success'|'danger', actionLabel?, onAction?, duration? }).
 * Süre: 4 sn; eylemli 6 sn. Ekran okuyucuya duyurulur. Alt sekme çubuğunun üstünde durur (bottomOffset).
 */
export function ToastProvider({ children, bottomOffset = 72 }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const insets = useSafeAreaInsets();
  const { colors, elevation, radius } = useTheme();

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  const show = useCallback((opts) => {
    clearTimeout(timer.current);
    const t = typeof opts === 'string' ? { message: opts } : opts;
    setToast({ tone: 'info', ...t, id: Date.now() });
    AccessibilityInfo.announceForAccessibility?.(t.message);
    timer.current = setTimeout(() => setToast(null), t.duration ?? (t.actionLabel ? 6000 : 4000));
  }, []);
  const value = useMemo(() => ({ show, hide }), [show, hide]);
  const strip =
    toast &&
    { info: 'transparent', success: colors.success.border, danger: colors.danger.border }[
      toast.tone
    ];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + bottomOffset,
          }}
        >
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(150)}
            accessibilityLiveRegion="polite"
            style={[
              elevation.e4,
              {
                borderRadius: radius.md,
                borderLeftWidth: 4,
                borderLeftColor: strip,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
              },
            ]}
          >
            <Text variant="body-m" style={{ flex: 1, color: colors.text.inverse }}>
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <Pressable
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
                accessibilityRole="button"
                hitSlop={8}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text
                  variant="label-m"
                  style={{ color: colors.text.inverse, textDecorationLine: 'underline' }}
                >
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
