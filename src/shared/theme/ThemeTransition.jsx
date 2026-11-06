import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, Path, Pattern } from 'react-native-svg';
import { captureScreen, releaseCapture } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';
import { create } from 'zustand';
import { useThemeStore } from '@store/themeStore';

/**
 * Tema değişiminde yumuşak geçiş (web'deki shared/utils/themeTransition.js ile aynı dil): eski ekranın
 * görüntüsü üstte kalır, yeni tema dokunulan noktadan büyüyen bir daireyle açılır. 480 ms, yumuşak çıkış.
 * Akış: ekran görüntüsü → görüntü katmanda yüklenince temayı değiştir → görüntüde delik büyüt → katmanı kaldır.
 * Azaltılmış harekette, aynı temaya geçişte ya da görüntü alınamazsa tema anında değişir.
 */
const DURATION = 480;
const EASE = Easing.bezier(0.2, 0, 0, 1);
const LOAD_TIMEOUT_MS = 400;
// Görüntü bu sürede gelmezse animasyonsuz geç: dokunuş hiçbir zaman "tepkisiz" kalmasın.
const CAPTURE_TIMEOUT_MS = 600;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Tam ekran dikdörtgen + ortası (x,y) yarıçapı r olan daire; evenodd ile daire delik olur.
const holePath = (w, h, x, y, r) => {
  'worklet';
  const k = Math.max(r, 0.01);
  return `M0 0H${w}V${h}H0Z M${x - k} ${y}a${k} ${k} 0 1 0 ${2 * k} 0a${k} ${k} 0 1 0 ${-2 * k} 0Z`;
};

const useTransitionStore = create((set) => ({
  job: null,
  start: (job) => set({ job }),
  clear: () => set({ job: null }),
}));

const resolve = (mode, system) =>
  mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

/** (mode, origin?) — origin: { x, y } ekran noktası (dokunulan yer); yoksa ekranın ortası. */
export function useSwitchTheme() {
  const reduced = useReducedMotion();
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return useCallback(
    (next, origin) => {
      const busy = Boolean(useTransitionStore.getState().job);
      if (reduced || busy || resolve(next, system) === resolve(mode, system)) {
        setMode(next);
        return;
      }
      useTransitionStore.getState().start({ mode: next, origin });
    },
    [reduced, system, mode, setMode],
  );
}

/** Kökte, gezinme yığınının üstünde bir kez yer alır. Dokunuşları engellemez. */
export function ThemeTransitionLayer() {
  const job = useTransitionStore((s) => s.job);
  const clear = useTransitionStore((s) => s.clear);
  const setMode = useThemeStore((s) => s.setMode);
  const { width, height } = useWindowDimensions();
  const [uri, setUri] = useState(null);
  const uriRef = useRef(null);
  const r = useSharedValue(0);
  const switched = useRef(false);

  const x = job?.origin?.x ?? width / 2;
  const y = job?.origin?.y ?? height / 2;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));

  const finish = useCallback(() => {
    if (uriRef.current) releaseCapture(uriRef.current);
    uriRef.current = null;
    setUri(null);
    switched.current = false;
    clear();
  }, [clear]);

  // 1) Eski ekranın görüntüsü. Alınamazsa animasyonsuz geç.
  useEffect(() => {
    if (!job) return undefined;
    let alive = true;
    r.value = 0;
    const giveUp = () => {
      if (!alive) return;
      alive = false;
      setMode(job.mode);
      clear();
    };
    const timer = setTimeout(giveUp, CAPTURE_TIMEOUT_MS);
    captureScreen({ format: 'jpg', quality: 0.9, result: 'tmpfile' })
      .then((u) => {
        clearTimeout(timer);
        if (!alive) {
          releaseCapture(u);
          return;
        }
        uriRef.current = u;
        setUri(u);
      })
      .catch(() => {
        clearTimeout(timer);
        giveUp();
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [job, r, setMode, clear]);

  // 2) Görüntü üstte görününce temayı değiştir, bir kare sonra deliği büyüt.
  const reveal = useCallback(() => {
    if (!job || switched.current) return;
    switched.current = true;
    setMode(job.mode);
    requestAnimationFrame(() => {
      // Yarıda kesilse de katman kalkmalı; o yüzden "done" beklenmez.
      r.value = withTiming(radius, { duration: DURATION, easing: EASE }, () => {
        scheduleOnRN(finish);
      });
    });
  }, [job, radius, r, setMode, finish]);

  // onLoad gelmezse (nadiren) yine de devam et.
  useEffect(() => {
    if (!uri) return undefined;
    const id = setTimeout(reveal, LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [uri, reveal]);

  // iOS: <Mask> içindeki animasyonlu şekil maskeyi yeniden çizdirmiyor; bu yüzden deliği çizilen yolun kendisi taşır.
  const holeProps = useAnimatedProps(() => ({ d: holePath(width, height, x, y, r.value) }));

  if (!job || !uri) return null;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern
          id="theme-snap"
          patternUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={width}
          height={height}
        >
          <SvgImage
            href={{ uri }}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="none"
            onLoad={reveal}
          />
        </Pattern>
      </Defs>
      <AnimatedPath fill="url(#theme-snap)" fillRule="evenodd" animatedProps={holeProps} />
    </Svg>
  );
}
