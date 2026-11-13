import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@api';
import { unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';

const interval = (m) => {
  if (!m) return 2000;
  if (m.status === 'finished' || m.status === 'expired') return false;
  if (m.status === 'waiting') return 2000;
  return m.mode === 'turn' ? 5000 : 1500;
};

/** Çevrimiçi maç: yoklayarak güncel `match`; `play` = benim görünümüm (tek kişilik play ile aynı şekil). */
export function useMatchPlay(code) {
  const q = useQuery({
    queryKey: queryKeys.games.match(code ?? 'none'),
    queryFn: async () => unwrap(await api.gamesMatchGet(code)),
    enabled: Boolean(code),
    refetchInterval: (query) => interval(query.state.data?.match),
  });
  const match = q.data?.match || null;
  const [play, setPlay] = useState(null);
  const seen = useRef(null);
  useEffect(() => {
    if (!match?.me) return;
    const key = match.mode === 'turn' ? match.version : null;
    if (!play || match.me.status !== play.status || (key !== null && key !== seen.current)) {
      seen.current = key;
      setPlay(match.me);
    }
  }, [match, play]);
  const skew = useMemo(() => (match ? Date.parse(match.serverNow) - q.dataUpdatedAt : 0), [match, q.dataUpdatedAt]);
  return { match, play, setPlay, skew, error: q.error, isLoading: q.isLoading };
}
