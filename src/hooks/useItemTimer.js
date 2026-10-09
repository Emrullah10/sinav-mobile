import { useCallback, useEffect, useRef } from 'react';

/** Soru başına harcanan süre (ms). `reset()` yeni soruda; `elapsed()` cevap anında. */
export const useItemTimer = (resetKey) => {
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [resetKey]);
  const elapsed = useCallback(() => Math.max(0, Date.now() - startedAt.current), []);
  const reset = useCallback(() => {
    startedAt.current = Date.now();
  }, []);
  return { elapsed, reset };
};
