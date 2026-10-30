import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@theme';

// Marka işareti (uygulama ikonuyla aynı geometri, assets/brand/mark.svg): açık halka = ilerleme, amber nokta = odak.
const ARC = 'M769.2 462.0A262 262 0 1 1 534.8 251.0';

/** size: px. ring: halka rengi (varsayılan accent), dot: nokta rengi (varsayılan reward). */
export function BrandMark({ size = 72, ring, dot, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
    >
      <Path d={ARC} fill="none" stroke={ring || colors.accent.default} strokeWidth={112} strokeLinecap="round" />
      <Circle cx={687.3} cy={317.3} r={64} fill={dot || colors.reward.default} />
    </Svg>
  );
}

export default BrandMark;
