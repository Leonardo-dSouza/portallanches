import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { StreetZoneCount } from '../api/types';

/**
 * Clientes por rua e bairro, para o caixa preencher o bairro de um cliente novo pela rua. Busca
 * uma vez quando o pedido vira entrega (`enabled`); falha na busca só deixa sem preenchimento.
 *
 * @example const counts = useStreetZones(cash, values.type === 'DELIVERY');
 */
export function useStreetZones(
  cash: CashApi,
  enabled: boolean,
): StreetZoneCount[] {
  const [counts, setCounts] = useState<StreetZoneCount[] | null>(null);
  const loaded = counts !== null;
  useEffect(() => {
    if (!enabled || loaded) return;
    let current = true;
    cash
      .listStreetZones()
      .then((found) => current && setCounts(found))
      .catch(() => current && setCounts([]));
    return () => {
      current = false;
    };
  }, [cash, enabled, loaded]);
  return counts ?? [];
}
