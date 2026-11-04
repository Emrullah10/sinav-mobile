import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useTheme } from '@theme';
import { useThemeStore } from '@store/themeStore';

const SIZE = { '-1': 16, 0: 18, 1: 20, 2: 23 };

/** Okuma tercihleri sunucuda (web Ayarlar ile aynı kayıt): cihazlar arası geçerlidir. Değişiklik anında uygulanır. */
export function useReaderPrefs() {
  const qc = useQueryClient();
  const { type } = useTheme();
  const setMode = useThemeStore((s) => s.setMode);
  const key = queryKeys.account.prefs();
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.identityPreferencesGet()), staleTime: 5 * 60 * 1000 });
  const save = useMutation({ mutationFn: async (body) => unwrap(await api.identityPreferencesUpdate(body)) });
  const update = (patch) => {
    qc.setQueryData(key, (old) => ({ ...(old || {}), ...patch }));
    if (patch.theme) setMode(patch.theme);
    save.mutate(patch);
  };
  const p = q.data || {};
  const scale = p.readingTextScale ?? 0;
  const font = p.readingFont === 'literata' || !p.readingFont ? 'literata' : 'figtree';
  const spacing = p.readingLineSpacing ?? 0;
  const px = SIZE[scale] ?? 18;
  return {
    prefs: { scale, font, spacing, theme: p.theme || 'system' },
    update,
    textStyle: {
      fontFamily: font === 'figtree' ? type['body-l'].fontFamily : type['reading-l'].fontFamily,
      fontSize: px,
      lineHeight: Math.round(px * (spacing ? 1.85 : 1.6)),
    },
  };
}
