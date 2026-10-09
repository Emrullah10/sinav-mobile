import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

/**
 * Alt sayfa (gorhom BottomSheetModal sarmalayıcısı; kökte BottomSheetModalProvider gerekir — AppProviders sağlar).
 * Kullanım: ref.current.present() / dismiss()  ya da  visible={bool}.
 * Props: title, snapPoints (varsayılan: içeriğe göre dinamik), scrollable, onDismiss, showClose (true), children.
 * Köşe 24, tutamaç + kapat düğmesi, arka plan karartması dokunulunca kapatır.
 */
export const Sheet = forwardRef(function Sheet(
  {
    title,
    snapPoints,
    scrollable = false,
    visible,
    onDismiss,
    showClose = true,
    dismissible = true,
    children,
  },
  ref,
) {
  const { colors, radius } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const modal = useRef(null);
  useImperativeHandle(
    ref,
    () => ({ present: () => modal.current?.present(), dismiss: () => modal.current?.dismiss() }),
    [],
  );
  useEffect(() => {
    if (visible === undefined) return;
    if (visible) modal.current?.present();
    else modal.current?.dismiss();
  }, [visible]);
  const backdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissible ? 'close' : 'none'}
        style={[props.style, { backgroundColor: colors.bg.scrim }]}
      />
    ),
    [colors.bg.scrim, dismissible],
  );
  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;
  return (
    <BottomSheetModal
      ref={modal}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose={dismissible}
      backdropComponent={backdrop}
      onDismiss={onDismiss}
      backgroundStyle={{
        backgroundColor: colors.bg.raised,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.border.strong, width: 40 }}
      topInset={insets.top}
    >
      <Body
        style={{ flexGrow: 0 }}
        contentContainerStyle={scrollable ? { paddingBottom: insets.bottom + 16 } : undefined}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: scrollable ? 0 : insets.bottom + 16 }}>
          {title || showClose ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 8 }}
            >
              <Text variant="heading-3" style={{ flex: 1 }} accessibilityRole="header">
                {title}
              </Text>
              {showClose && dismissible ? (
                <IconButton
                  icon={X}
                  size={36}
                  accessibilityLabel={t('common.close')}
                  onPress={() => modal.current?.dismiss()}
                />
              ) : null}
            </View>
          ) : null}
          {children}
        </View>
      </Body>
    </BottomSheetModal>
  );
});
