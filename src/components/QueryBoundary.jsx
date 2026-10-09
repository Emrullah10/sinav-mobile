import { View } from 'react-native';
import { errorKind } from '@shared/api/helpers';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

/**
 * React Query sonucunu çizer: yükleniyor -> iskelet, hata -> ErrorState (tekrar dene), veri -> children(data).
 * Props: query (useQuery sonucu), children (fonksiyon), skeleton (düğüm), emptyWhen(data) -> düğüm.
 */
export function QueryBoundary({ query, children, skeleton, errorOverride }) {
  if (query.isPending) {
    return (
      skeleton || (
        <View style={{ gap: 12, paddingTop: 8 }}>
          <Skeleton height={96} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      )
    );
  }
  if (query.isError) {
    const o = errorOverride?.(query.error);
    if (o) return o;
    return <ErrorState kind={errorKind(query.error)} onRetry={() => query.refetch()} />;
  }
  return children(query.data);
}
