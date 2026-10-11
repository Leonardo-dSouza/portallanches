import { useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { ProductApi } from '../api/product-api';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';

export interface TicketLoad {
  stored: AppSettings | null;
  /** Nomes do cardápio ativo, para a prévia do papel. */
  menuNames: string[];
  error: string | null;
}

/**
 * O que a aba Comanda mostra ao abrir: as configurações gravadas e os nomes do cardápio.
 *
 * @example const { stored, menuNames } = useTicketLoad(settingsApi, productApi);
 */
export function useTicketLoad(
  settings: SettingsApi,
  products: ProductApi,
): TicketLoad {
  const [load, setLoad] = useState<TicketLoad>({
    stored: null,
    menuNames: [],
    error: null,
  });
  useEffect(() => {
    let current = true;
    Promise.all([settings.readSettings(), products.listProducts()]).then(
      ([stored, menu]) => {
        const menuNames = menu.filter((p) => p.active).map((p) => p.name);
        if (current) setLoad({ stored, menuNames, error: null });
      },
      (failure) =>
        current &&
        setLoad({ stored: null, menuNames: [], error: errorMessage(failure) }),
    );
    return () => {
      current = false;
    };
  }, [settings, products]);
  return load;
}
