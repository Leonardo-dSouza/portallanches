import type { SelectionStorage } from '../stock/selection-storage';
import type { TextExport } from '../stock/text-export';

/** Seleção da lista de compras em memória, no lugar do localStorage. */
export class FakeSelectionStorage implements SelectionStorage {
  saved: number[] | null;

  constructor(saved: number[] | null = null) {
    this.saved = saved;
  }

  load(): number[] | null {
    return this.saved;
  }

  save(ids: number[]): void {
    this.saved = ids;
  }
}

/** Área de transferência e download de mentira: guarda o que seria copiado/baixado. */
export class FakeTextExport implements TextExport {
  copied: string[] = [];
  downloads: { filename: string; text: string }[] = [];
  copyWorks = true;

  async copy(text: string): Promise<boolean> {
    if (this.copyWorks) this.copied.push(text);
    return this.copyWorks;
  }

  download(filename: string, text: string): void {
    this.downloads.push({ filename, text });
  }
}
