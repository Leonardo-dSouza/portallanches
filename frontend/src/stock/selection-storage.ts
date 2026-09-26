/** Onde a tela lembra quais insumos entram na lista de compras (injetável nos testes). */
export interface SelectionStorage {
  /** null = nunca escolheu (a tela usa o padrão: só os que precisam de atenção). */
  load(): number[] | null;
  save(ids: number[]): void;
}

const KEY = 'portallanches.lista-de-compras';

/**
 * Seleção no `localStorage` deste navegador. É só conveniência: navegador sem
 * armazenamento (aba privada, bloqueio) funciona igual, só não lembra a escolha.
 *
 * @example const storage = createLocalSelectionStorage(); storage.save([1, 2]);
 */
export function createLocalSelectionStorage(): SelectionStorage {
  return {
    load() {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        return Array.isArray(parsed) ? parsed.filter(Number.isInteger) : null;
      } catch {
        return null;
      }
    },
    save(ids) {
      try {
        localStorage.setItem(KEY, JSON.stringify(ids));
      } catch {
        // Sem armazenamento: a seleção vale só enquanto a tela estiver aberta.
      }
    },
  };
}
