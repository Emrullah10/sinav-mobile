import { useCallback, useEffect, useState } from 'react';

/** Geri sayım (saniye). start(n) ile başlatılır; 0'da durur. */
export const useCooldown = () => {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const start = useCallback((s) => setLeft(Math.max(0, Math.ceil(s || 0))), []);
  return { left, start };
};
