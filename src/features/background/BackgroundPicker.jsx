import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { BG_PRESETS } from '@shared/vendor/domain/index.js';
import { deepLinks } from '@shared/vendor/client-sdk/index.js';
import { Banner, Text } from '@components';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useBackgroundStore } from '@store/backgroundStore';
import { useTheme } from '@theme';
import { BackgroundTile } from './BackgroundTile';
import { useBackground } from './useBackground';

const same = (a, b) => a?.key === b?.key && (a?.key !== 'custom' || a?.id === b?.id);
const GAP = 12;

/** Ayarlar › Arka plan: Sade + 2 ücretsiz desen, 3 Premium hazır desen, stüdyoda kaydedilenler ve stüdyoya giriş. */
export function BackgroundPicker() {
  const { t } = useT();
  const { colors, radius, space } = useTheme();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();
  const selection = useBackgroundStore((s) => s.selection);
  const custom = useBackgroundStore((s) => s.custom);
  const lapsed = useBackgroundStore((s) => s.locked);
  const { premium, save } = useBackground();
  const [upsell, setUpsell] = useState(false);
  const cols = width >= 600 ? 5 : 3;
  const tileW = Math.floor((Math.min(width, 720) - space[5] * 2 - GAP * (cols - 1)) / cols);
  const tileH = Math.round(tileW * 0.72);

  const pick = (sel, tier) => {
    haptics.select();
    if (tier === 'premium' && !premium) {
      setUpsell(true);
      return;
    }
    setUpsell(false);
    if (!same(sel, selection)) save.mutate({ background: sel });
  };

  return (
    <View style={{ gap: 12 }}>
      <Text variant="body-s" color="secondary">
        {t('bg.subtitle')}
      </Text>
      {lapsed ? <Banner tone="warning" message={t('bg.lapsed')} /> : null}
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}
      >
        {BG_PRESETS.map((p) => (
          <BackgroundTile
            key={p.key}
            id={p.key}
            spec={p.spec}
            width={tileW}
            height={tileH}
            label={t(`bg.preset.${p.key}`)}
            premium={p.tier === 'premium'}
            selected={same({ key: p.key }, selection)}
            onPress={() => pick({ key: p.key }, p.tier)}
          />
        ))}
        {custom.map((c, i) => (
          <BackgroundTile
            key={c.id}
            id={c.id}
            spec={c}
            width={tileW}
            height={tileH}
            label={`${t('bg.custom')} ${i + 1}`}
            selected={same({ key: 'custom', id: c.id }, selection)}
            onPress={() => pick({ key: 'custom', id: c.id }, 'premium')}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bg.create')}
          onPress={() => router.push(deepLinks.background)}
          style={({ pressed }) => ({
            width: tileW,
            height: tileH,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: pressed ? colors.accent.default : colors.border.strong,
            backgroundColor: pressed ? colors.accent['subtle-bg'] : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: 6,
          })}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent['subtle-bg'],
            }}
          >
            <Sparkles size={16} color={colors.accent['subtle-fg']} />
          </View>
          <Text variant="label-s" align="center" numberOfLines={2}>
            {t('bg.create')}
          </Text>
        </Pressable>
      </View>
      {upsell ? (
        <Banner
          tone="info"
          title={t('bg.lockedTitle')}
          message={t('bg.lockedBody')}
          onClose={() => setUpsell(false)}
          action={{ label: t('bg.cta'), onPress: () => router.push('/premium') }}
        />
      ) : null}
    </View>
  );
}
