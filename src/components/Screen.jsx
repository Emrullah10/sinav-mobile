import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme';

/**
 * Ekran iskeleti: güvenli alan + kaydırma + klavyeden kaçınma.
 * Props: header (ör. <TopBar/>; üst güvenli alanı o üstlenir), footer (alt sabit eylem, örn. birincil Button),
 * scroll (true), padded (true: 16 yatay boşluk), edges (varsayılan ['top']; alt güvenli alan için 'bottom' ekle),
 * onRefresh/refreshing (çek-yenile), keyboardAvoiding (true), contentContainerStyle, children.
 */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  padded = true,
  edges = ['top'],
  onRefresh,
  refreshing = false,
  keyboardAvoiding = true,
  background,
  contentContainerStyle,
  style,
  testID,
}) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const top = edges.includes('top') && !header ? insets.top : 0;
  const bottom = edges.includes('bottom') && !footer ? insets.bottom : 0;
  const px = padded ? space[5] : 0;
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { paddingTop: top, paddingBottom: bottom + space[7], paddingHorizontal: px, flexGrow: 1 },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.default}
            colors={[colors.accent.default]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, paddingTop: top, paddingBottom: bottom, paddingHorizontal: px },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[{ flex: 1, backgroundColor: background || colors.bg.canvas }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={keyboardAvoiding}
    >
      {header}
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: space[5],
            paddingTop: space[4],
            paddingBottom: Math.max(insets.bottom, space[4]),
            backgroundColor: colors.bg.canvas,
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
