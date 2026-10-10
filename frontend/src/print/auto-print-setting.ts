/** O pedaço do `localStorage` que a escolha usa (injetável nos testes). */
export interface AutoPrintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * "Imprimir ao salvar" vale por PC (2026-10-10): só o do caixa tem a térmica e o Chrome com
 * `--kiosk-printing`. Num PC sem isso, cada pedido salvo abriria a janela de impressão.
 */
const STORAGE_KEY = 'portallanches.caixa.imprimir-ao-salvar';
const ON = 'sim';

/** @example readAutoPrint(window.localStorage) // false num PC novo */
export function readAutoPrint(storage: AutoPrintStorage): boolean {
  try {
    return storage.getItem(STORAGE_KEY) === ON;
  } catch {
    return false;
  }
}

/** @example writeAutoPrint(window.localStorage, true) */
export function writeAutoPrint(storage: AutoPrintStorage, on: boolean): void {
  try {
    storage.setItem(STORAGE_KEY, on ? ON : 'nao');
  } catch {
    // Navegador que recusa: a escolha vale até recarregar a página.
  }
}
