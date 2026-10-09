import { QueryClient } from '@tanstack/react-query';
import { apiErrorCode } from '@shared/vendor/client-sdk/index.js';

const NO_RETRY = new Set(['VALIDATION_ERROR', 'PERMISSION_DENIED', 'NOT_FOUND', 'QUOTA_EXCEEDED']);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false; // 4xx tekrar denemekle düzelmez
        if (NO_RETRY.has(apiErrorCode(error))) return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});
