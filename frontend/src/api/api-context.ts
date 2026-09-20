import { createContext, useContext } from 'react';
import type { ApiClient } from './api-client';

export const ApiContext = createContext<ApiClient | null>(null);

/** @example const api = useApi(); await api.request('GET', '/orders/today'); */
export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (!api)
    throw new Error(
      'useApi usado fora de <ApiContext.Provider>: envolva a árvore com o provider',
    );
  return api;
}
