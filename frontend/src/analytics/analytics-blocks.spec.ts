import {
  blocksFor,
  readBlocks,
  writeBlocks,
  type BlockStorage,
} from './analytics-blocks';

/** `localStorage` em memória; `broken` simula navegador que recusa (aba anônima, bloqueio). */
class MemoryBlockStorage implements BlockStorage {
  readonly items = new Map<string, string>();
  broken = false;

  getItem(key: string): string | null {
    if (this.broken) throw new Error('armazenamento indisponível');
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.broken) throw new Error('armazenamento indisponível');
    this.items.set(key, value);
  }
}

const ALL = [
  'fechamento',
  'noites',
  'produtos',
  'categorias',
  'bairros',
  'clientes',
  'semana',
  'pagamentos',
];

describe('readBlocks / writeBlocks', () => {
  it('sem escolha guardada, tudo ligado', () => {
    expect([...readBlocks(new MemoryBlockStorage())]).toEqual(ALL);
  });

  it('guarda e lê a escolha, inclusive tudo desligado', () => {
    const storage = new MemoryBlockStorage();
    writeBlocks(storage, new Set(['bairros', 'pagamentos']));
    expect([...readBlocks(storage)]).toEqual(['bairros', 'pagamentos']);
    writeBlocks(storage, new Set());
    expect([...readBlocks(storage)]).toEqual([]);
  });

  it('JSON quebrado, ids desconhecidos ou navegador que recusa voltam ao padrão sem erro', () => {
    const storage = new MemoryBlockStorage();
    storage.items.set('portallanches.analise.blocos', '{quebrado');
    expect([...readBlocks(storage)]).toEqual(ALL);
    storage.items.set('portallanches.analise.blocos', '["bairros","xyz"]');
    expect([...readBlocks(storage)]).toEqual(['bairros']);
    storage.broken = true;
    expect([...readBlocks(storage)]).toEqual(ALL);
    expect(() => writeBlocks(storage, new Set())).not.toThrow();
    expect([...readBlocks(null)]).toEqual(ALL);
  });
});

describe('blocksFor', () => {
  it('um dia só tem o fechamento e não tem as noites nem os dias da semana', () => {
    const ids = (singleDay: boolean) => blocksFor(singleDay).map((b) => b.id);
    expect(ids(false)).toEqual(ALL.filter((id) => id !== 'fechamento'));
    expect(ids(true)).toEqual([
      'fechamento',
      'produtos',
      'categorias',
      'bairros',
      'clientes',
      'pagamentos',
    ]);
  });
});
