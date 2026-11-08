import { useState } from 'react';

export type StockTabWithMenuFilter = 'status' | 'count';

/** Onde a tela lembra a escolha do filtro "Baixa na venda" por aba (injetável nos testes). */
export interface MenuFilterStorage {
  /** null = nunca escolheu (a tela usa o padrão: true = só baixa na venda). */
  load(tab: StockTabWithMenuFilter): boolean | null;
  save(tab: StockTabWithMenuFilter, soldInMenuOnly: boolean): void;
}

const KEY_PREFIX = 'portallanches.estoque.baixa-venda';

/**
 * Filtro "Baixa na venda" salvo no localStorage deste navegador por aba.
 * Navegador sem armazenamento (aba privada, bloqueio) volta ao padrão true.
 *
 * @example const storage = createLocalMenuFilterStorage(); storage.save('status', false);
 */
export function createLocalMenuFilterStorage(): MenuFilterStorage {
  return {
    load(tab) {
      try {
        const raw = localStorage.getItem(`${KEY_PREFIX}.${tab}`);
        if (raw === null) return null;
        return raw === 'true';
      } catch {
        return null;
      }
    },
    save(tab, soldInMenuOnly) {
      try {
        localStorage.setItem(`${KEY_PREFIX}.${tab}`, String(soldInMenuOnly));
      } catch {
        // Sem armazenamento: a escolha vale só enquanto a tela estiver aberta.
      }
    },
  };
}

/**
 * Estado do filtro "Baixa na venda" de uma aba, persistido no storage injetado.
 *
 * @example const [menuOnly, setMenuOnly] = useMenuFilter('status', storage);
 */
export function useMenuFilter(
  tab: StockTabWithMenuFilter,
  storage?: MenuFilterStorage,
): [boolean, (choice: boolean) => void] {
  const [filterStorage] = useState(
    () => storage ?? createLocalMenuFilterStorage(),
  );
  const [soldInMenuOnly, setSoldInMenuOnly] = useState<boolean>(
    () => filterStorage.load(tab) ?? true,
  );

  const updateChoice = (choice: boolean) => {
    setSoldInMenuOnly(choice);
    filterStorage.save(tab, choice);
  };

  return [soldInMenuOnly, updateChoice];
}
