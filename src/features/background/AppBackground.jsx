import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { bgSurfaceSvg, resolveBgSpec } from '@shared/vendor/domain/index.js';
import { useBackgroundStore } from '@store/backgroundStore';
import { useTheme } from '@theme';
import { useInBackgroundScope } from './BackgroundScope';

const Surface = memo(function Surface({ xml, width, height }) {
  return <SvgXml xml={xml} width={width} height={height} />;
});

/** Ekranın arkasındaki desen (Screen içinde, kaydırılan içeriğin altında sabit). Sade seçiliyse ya da kapsam dışıysa hiçbir şey çizmez. */
export function AppBackground() {
  const inScope = useInBackgroundScope();
  const { scheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const selection = useBackgroundStore((s) => s.selection);
  const custom = useBackgroundStore((s) => s.custom);
  const draft = useBackgroundStore((s) => s.draft);
  const spec = draft || resolveBgSpec(selection, custom);
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const xml = useMemo(
    () => (spec ? bgSurfaceSvg(spec, scheme, { width: w, height: h }) : null),
    [spec, scheme, w, h],
  );
  if (!inScope || !xml) return null;
  // Seçim değişince yumuşakça belirir; stüdyoda ayar oynarken (draft) her adımda yeniden belirmesin.
  const key = draft ? 'draft' : JSON.stringify(spec);
  return (
    <Animated.View
      key={key}
      entering={FadeIn.duration(350)}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Surface xml={xml} width={w} height={h} />
    </Animated.View>
  );
}
