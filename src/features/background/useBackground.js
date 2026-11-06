import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { errorText, unwrap } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useT } from '@shared/translation/useT';
import { useBackgroundStore } from '@store/backgroundStore';
import { useToast } from '@components';

/** Arka plan seçimi/kaydı. Seçim iyimser uygulanır (anında görünür); sunucu reddederse geri alınır. */
export function useBackground() {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const isGuest = useAuthStore((s) => s.isGuest);
  const ent = useQuery({
    queryKey: queryKeys.billing.entitlements(),
    enabled: authed && !isGuest,
    queryFn: async () => unwrap(await api.billingEntitlementsGet()),
  });
  const premium = ent.data?.tier === 'premium';
  const save = useMutation({
    mutationFn: async (body) => unwrap(await api.identityPreferencesUpdate(body)),
    onMutate: (body) => {
      const s = useBackgroundStore.getState();
      const prev = { selection: s.selection, custom: s.custom };
      if (body.background) s.setSelection(body.background);
      return prev;
    },
    onSuccess: (data) => {
      useBackgroundStore.getState().apply(data);
      qc.setQueryData(queryKeys.account.prefs(), data);
    },
    onError: (e, _body, prev) => {
      if (prev) useBackgroundStore.setState(prev);
      toast.show({ message: errorText(t, e), tone: 'danger' });
    },
  });
  return { premium, save };
}
