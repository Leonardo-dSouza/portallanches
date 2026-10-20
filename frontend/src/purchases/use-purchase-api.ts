import { useMemo } from 'react';
import { useApi } from '../api/api-context';
import { createPurchaseApi, type PurchaseApi } from '../api/purchase-api';

/** API de Compras estável entre renderizações (o `useRangeData` refaz a busca quando ela muda). */
export function usePurchaseApi(): PurchaseApi {
  const api = useApi();
  return useMemo(() => createPurchaseApi(api), [api]);
}
