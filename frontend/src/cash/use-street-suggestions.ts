import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';

interface LoadedStreets {
  zoneId: number | null;
  streets: string[];
}

/**
 * Ruas já cadastradas no bairro escolhido (ou em todos, sem bairro), para sugerir no campo Rua.
 * Só busca com `enabled` (pedido de entrega). Falha na busca só deixa sem sugestões.
 *
 * @example const streets = useStreetSuggestions(cash, zone?.id ?? null, isDelivery);
 */
export function useStreetSuggestions(
  cash: CashApi,
  zoneId: number | null,
  enabled: boolean,
): string[] {
  const [loaded, setLoaded] = useState<LoadedStreets | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    cash
      .listStreets(zoneId)
      .then((streets) => current && setLoaded({ zoneId, streets }))
      .catch(() => current && setLoaded({ zoneId, streets: [] }));
    return () => {
      current = false;
    };
  }, [cash, zoneId, enabled]);
  // Enquanto chega a lista do bairro novo, não mostra a do bairro anterior.
  return enabled && loaded?.zoneId === zoneId ? loaded.streets : [];
}
