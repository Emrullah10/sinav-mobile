import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@api';
import { apiErrorCode, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { useMatchPlay } from './useMatchPlay';

/** Oyun oturumu başlatma/yeniden başlatma; `skew` = sunucu saati − cihaz saati (ms). */
export function useGamePlay(game, kind, level, matchCode) {
  const mp = useMatchPlay(matchCode);
  const qc = useQueryClient();
  const [play, setPlay] = useState(null);
  const [error, setError] = useState(null);
  const [skew, setSkew] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const start = useMutation({
    mutationFn: async (vars) => unwrap(await api.gamesPlayStart(vars)),
    onSuccess: (d) => {
      setPlay(d.play);
      setSkew(Date.parse(d.play.serverNow) - Date.now());
      setError(null);
      qc.invalidateQueries({ queryKey: queryKeys.games.hub() });
    },
    onError: (e) => setError(e),
  });
  const begin = useCallback((k) => start.mutate({ game, kind: k, level: k === 'level' ? level : undefined }), [start, game, level]);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!matchCode) begin(kind);
  }, [begin, kind, matchCode]);
  const again = () => {
    setBlocked(false);
    setPlay(null);
    start.mutate({ game, kind: kind === 'marathon' ? 'marathon' : 'free' }, { onError: (e) => { if (apiErrorCode(e) === 'QUOTA_EXCEEDED') setBlocked(true); } });
  };
  if (matchCode) return { play: mp.play, setPlay: mp.setPlay, error: mp.error, skew: mp.skew, blocked: false, again: () => {}, match: mp.match };
  return { play, setPlay, error, skew, blocked, again };
}
