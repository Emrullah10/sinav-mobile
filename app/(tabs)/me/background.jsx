import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Sparkles, Trash2 } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { tokens } from '@shared/vendor/design-tokens/tokens.js';
import {
  BG_COLOR_KEYS,
  BG_MAX_CUSTOM,
  BG_PATTERNS,
  bgColorHex,
  bgSurfaceSvg,
  newBgId,
  normalizeBgSpec,
} from '@shared/vendor/domain/index.js';
import {
  Banner,
  Button,
  IconButton,
  Screen,
  Segmented,
  SwitchRow,
  Text,
  TopBar,
  useToast,
} from '@components';
import { BackgroundTile } from '@features/background/BackgroundTile';
import { useBackground } from '@features/background/useBackground';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useBackgroundStore } from '@store/backgroundStore';
import { useTheme } from '@theme';

const DEFAULT_SPEC = { pattern: 'contour', color: 'teal', intensity: 2, scale: 1, glow: true };
const SCALES = [0.7, 1, 1.3, 1.6];
const nearestScale = (v) => SCALES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** Açık ve koyu temada aynı tasarımın yan yana önizlemesi (ekranın temasından bağımsız). */
function SchemePreview({ spec, scheme, label, width, height }) {
  const { radius } = useTheme();
  const { t } = useT();
  const c = tokens[scheme];
  const xml = useMemo(
    () => bgSurfaceSvg(spec, scheme, { width, height, id: `p${scheme}` }),
    [spec, scheme, width, height],
  );
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        width,
        height,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: c.bg.canvas,
        borderWidth: 1,
        borderColor: c.border.default,
      }}
    >
      {xml ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <SvgXml xml={xml} width={width} height={height} />
        </View>
      ) : null}
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 8,
          paddingHorizontal: 8,
          paddingVertical: 1,
          borderRadius: radius.full,
          backgroundColor: c.bg.surface,
        }}
      >
        <Text variant="label-s" style={{ color: c.text.secondary, fontSize: 11 }}>
          {label}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: 10,
          right: 22,
          top: 34,
          padding: 10,
          gap: 3,
          borderRadius: radius.md,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.border.default,
        }}
      >
        <Text variant="label-m" numberOfLines={1} style={{ color: c.text.primary }}>
          {t('bg.studio.sampleTitle')}
        </Text>
        <View
          style={{ height: 4, width: '80%', borderRadius: 2, backgroundColor: c.border.default }}
        />
        <View
          style={{
            marginTop: 6,
            width: 40,
            height: 14,
            borderRadius: 7,
            backgroundColor: c.accent.default,
          }}
        />
      </View>
    </View>
  );
}

function Field({ label, value, children }) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text variant="title">{label}</Text>
        {value != null ? (
          <Text variant="body-s" color="secondary">
            {value}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Desen stüdyosu (Premium; ücretsiz kullanıcı serbestçe dener, kaydetmek Premium ister).
 * Ayarlanan desen bu ekranın arkasında canlı görünür (draft); çıkınca kayıtlı seçime dönülür.
 */
export default function BackgroundStudio() {
  const { t } = useT();
  const toast = useToast();
  const haptics = useHaptics();
  const { colors, radius, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const custom = useBackgroundStore((s) => s.custom);
  const selection = useBackgroundStore((s) => s.selection);
  const setDraft = useBackgroundStore((s) => s.setDraft);
  const { premium, save } = useBackground();

  const startId =
    (typeof params.id === 'string' && params.id) ||
    (selection.key === 'custom' ? selection.id : null);
  const start = custom.find((c) => c.id === startId);
  const [editingId, setEditingId] = useState(start?.id || null);
  const [spec, setSpec] = useState(() => normalizeBgSpec(start) || DEFAULT_SPEC);

  // Önizleme yalnız bu ekran odaktayken: sekme değişince ekran yığında kalsa da diğer ekranlar kayıtlı arka planı gösterir.
  const specRef = useRef(spec);
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      setDraft(specRef.current);
      return () => {
        focused.current = false;
        setDraft(null);
      };
    }, [setDraft]),
  );
  useEffect(() => {
    specRef.current = spec;
    if (focused.current) setDraft(spec);
  }, [spec, setDraft]);

  const set = (patch) => {
    haptics.select();
    setSpec((s) => normalizeBgSpec({ ...s, ...patch }));
  };
  const full = !editingId && custom.length >= BG_MAX_CUSTOM;
  const inner = Math.min(width, 720) - 32;
  const previewW = Math.floor((inner - 12) / 2);
  const swatchW = Math.floor((inner - 3 * 10) / 4);
  // 8 renk tek satıra sığsın.
  const dot = Math.min(38, Math.floor((inner - 7 * 8) / 8));

  const submit = () => {
    if (!premium) {
      router.push('/premium');
      return;
    }
    const id = editingId || newBgId();
    const list = editingId
      ? custom.map((c) => (c.id === id ? { id, ...spec } : c))
      : [...custom, { id, ...spec }];
    save.mutate(
      { customBackgrounds: list, background: { key: 'custom', id } },
      {
        onSuccess: () => {
          setEditingId(id);
          toast.show({ message: t('bg.studio.saved'), tone: 'success' });
        },
      },
    );
  };
  const remove = (id) =>
    save.mutate(
      { customBackgrounds: custom.filter((c) => c.id !== id) },
      {
        onSuccess: () => {
          if (editingId === id) setEditingId(null);
          toast.show({ message: t('bg.studio.deleted'), tone: 'success' });
        },
      },
    );

  return (
    <Screen
      header={<TopBar title={t('bg.studio.title')} onBack={() => router.back()} />}
      edges={['bottom']}
      footer={
        <View style={{ gap: 10 }}>
          {!premium ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                padding: 12,
                borderRadius: radius.md,
                backgroundColor: colors.reward['subtle-bg'],
              }}
            >
              <Sparkles size={16} color={colors.reward.icon} />
              <Text variant="body-s" style={{ flex: 1 }}>
                {t('bg.studio.tryFree')}
              </Text>
            </View>
          ) : null}
          <Button
            title={
              !premium
                ? t('bg.studio.unlock')
                : editingId
                  ? t('bg.studio.update')
                  : t('bg.studio.save')
            }
            leftIcon={premium ? undefined : Sparkles}
            loading={save.isPending}
            disabled={premium && full}
            onPress={submit}
          />
        </View>
      }
    >
      <View style={{ gap: 24, paddingTop: 8 }}>
        <Text variant="body-m" color="secondary">
          {t('bg.studio.subtitle')}
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SchemePreview
            spec={spec}
            scheme="light"
            label={t('bg.studio.previewLight')}
            width={previewW}
            height={128}
          />
          <SchemePreview
            spec={spec}
            scheme="dark"
            label={t('bg.studio.previewDark')}
            width={previewW}
            height={128}
          />
        </View>

        <Field label={t('bg.studio.pattern')}>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
          >
            {BG_PATTERNS.map((p) => {
              const on = spec.pattern === p;
              const xml = bgSurfaceSvg(
                { ...spec, pattern: p, intensity: 5, scale: 0.6, glow: false },
                scheme,
                { width: swatchW - 10, height: 38, id: `s${p}` },
              );
              return (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t(`bg.pattern.${p}`)}
                  onPress={() => set({ pattern: p })}
                  style={{
                    width: swatchW,
                    padding: 5,
                    paddingBottom: 7,
                    gap: 5,
                    alignItems: 'center',
                    borderRadius: radius.md,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? colors.accent.default : colors.border.default,
                    backgroundColor: on ? colors.accent['subtle-bg'] : colors.bg.surface,
                  }}
                >
                  <View
                    style={{
                      width: swatchW - 10,
                      height: 38,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                      backgroundColor: colors.bg.canvas,
                    }}
                  >
                    {xml ? <SvgXml xml={xml} width={swatchW - 10} height={38} /> : null}
                  </View>
                  <Text
                    variant="label-s"
                    numberOfLines={1}
                    style={{ color: on ? colors.accent.default : colors.text.secondary }}
                  >
                    {t(`bg.pattern.${p}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={t('bg.studio.colorLabel')} value={t(`bg.color.${spec.color}`)}>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            {BG_COLOR_KEYS.map((k) => {
              const on = spec.color === k;
              const hex = bgColorHex(k, scheme);
              return (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t(`bg.color.${k}`)}
                  hitSlop={4}
                  onPress={() => set({ color: k })}
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: on ? 2 : 0,
                    borderColor: hex,
                  }}
                >
                  <View
                    style={{
                      width: on ? dot - 10 : dot - 4,
                      height: on ? dot - 10 : dot - 4,
                      borderRadius: dot / 2,
                      backgroundColor: hex,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={t('bg.studio.intensity')}>
          <Segmented
            value={spec.intensity}
            onChange={(v) => set({ intensity: v })}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
            accessibilityLabel={t('bg.studio.intensity')}
          />
        </Field>

        <Field label={t('bg.studio.scale')}>
          <Segmented
            value={nearestScale(spec.scale)}
            onChange={(v) => set({ scale: v })}
            options={SCALES.map((n) => ({ value: n, label: `${n}×` }))}
            accessibilityLabel={t('bg.studio.scale')}
          />
        </Field>

        <SwitchRow
          label={t('bg.studio.glow')}
          description={t('bg.studio.glowHint')}
          value={spec.glow}
          onValueChange={(v) => set({ glow: v })}
        />

        {premium && full ? <Banner tone="warning" message={t('bg.studio.limit')} /> : null}

        {custom.length > 0 ? (
          <Field
            label={t('bg.mine')}
            value={t('bg.mineCount', { n: custom.length, max: BG_MAX_CUSTOM })}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {custom.map((c, i) => (
                <View key={c.id} style={{ alignItems: 'center', gap: 4 }}>
                  <BackgroundTile
                    id={`m${c.id}`}
                    role="button"
                    spec={c}
                    width={swatchW + 8}
                    height={56}
                    label={`${t('bg.custom')} ${i + 1}`}
                    selected={editingId === c.id}
                    onPress={() => {
                      haptics.select();
                      setEditingId(c.id);
                      setSpec(normalizeBgSpec(c));
                    }}
                  />
                  <IconButton
                    icon={Trash2}
                    accessibilityLabel={`${t('bg.studio.delete')} · ${t('bg.custom')} ${i + 1}`}
                    onPress={() => remove(c.id)}
                  />
                </View>
              ))}
              {custom.length < BG_MAX_CUSTOM ? (
                <Button
                  title={t('bg.studio.new')}
                  variant="secondary"
                  size="md"
                  fullWidth={false}
                  onPress={() => {
                    setEditingId(null);
                    setSpec(DEFAULT_SPEC);
                  }}
                />
              ) : null}
            </View>
          </Field>
        ) : null}
      </View>
    </Screen>
  );
}
