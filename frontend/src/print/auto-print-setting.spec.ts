import {
  readAutoPrint,
  writeAutoPrint,
  type AutoPrintStorage,
} from './auto-print-setting';

/** `localStorage` em memória; `broken` simula navegador que recusa (aba anônima, bloqueio). */
class MemoryAutoPrintStorage implements AutoPrintStorage {
  readonly items = new Map<string, string>();
  broken = false;

  getItem(key: string): string | null {
    if (this.broken) throw new Error('armazenamento bloqueado');
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.broken) throw new Error('armazenamento bloqueado');
    this.items.set(key, value);
  }
}

describe('auto-print-setting', () => {
  it('começa desligado e lembra a escolha deste PC', () => {
    const storage = new MemoryAutoPrintStorage();
    expect(readAutoPrint(storage)).toBe(false);
    writeAutoPrint(storage, true);
    expect(readAutoPrint(storage)).toBe(true);
    writeAutoPrint(storage, false);
    expect(readAutoPrint(storage)).toBe(false);
  });

  it('navegador que recusa o armazenamento: desligado, sem erro', () => {
    const storage = new MemoryAutoPrintStorage();
    storage.broken = true;
    expect(() => writeAutoPrint(storage, true)).not.toThrow();
    expect(readAutoPrint(storage)).toBe(false);
  });
});
