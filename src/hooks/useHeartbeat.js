import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';

const INTERVAL_MS = 30_000;

/**
 * Etkin çalışma süresi: ekran açık ve uygulama ön plandayken ~30 sn'de bir sunucuya bildirir
 * (seri/günlük hedef bununla ilerler). enabled=false iken durur.
 */
export const useHeartbeat = (sessionCode, enabled = true) => {
  const qc = useQueryClient();
  const last = useRef(0);
  useEffect(() => {
    if (!enabled) return undefined;
    last.current = Date.now();
    const send = () => {
      const now = Date.now();
      const seconds = Math.min(120, Math.round((now - last.current) / 1000));
      last.current = now;
      if (seconds <= 0) return;
      api
        .learningActivityHeartbeat({ seconds, ...(sessionCode ? { sessionCode: Number(sessionCode) } : {}) })
        .then(() => qc.invalidateQueries({ queryKey: queryKeys.learning.today() }))
        .catch(() => {});
    };
    const id = setInterval(() => {
      if (AppState.currentState === 'active') send();
      else last.current = Date.now();
    }, INTERVAL_MS);
    return () => {
      clearInterval(id);
      send();
    };
  }, [sessionCode, enabled, qc]);
};
