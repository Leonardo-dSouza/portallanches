import { UnprocessableEntityException } from '@nestjs/common';
import { FakeMenuImportTarget } from '../menu-import/fake-menu-import-target.fixture.js';
import type { FormulaWorkbookReader } from '../menu-import/formula-grid-reader.js';
import { gridOf } from '../menu-import/menu-grid.fixture.js';
import type { MenuSnapshot } from '../menu-import/menu-import-target.js';
import type { FormulaGrid } from '../menu-import/menu-types.js';
import { SpreadsheetImportService } from './spreadsheet-import.service.js';

/** Leitor que devolve abas prontas, ou falha como um arquivo que não é planilha. */
class FakeWorkbookReader implements FormulaWorkbookReader {
  constructor(private readonly grids: Map<string, FormulaGrid> | null) {}

  readSheets(): Promise<Map<string, FormulaGrid>> {
    return this.readSheetsFromBuffer();
  }

  async readSheetsFromBuffer(): Promise<Map<string, FormulaGrid>> {
    if (!this.grids) throw new Error("Can't find end of central directory");
    return this.grids;
  }
}

const BEVERAGES = new Map([
  ['Plan1', gridOf({ B4: 'coca cola lt 350ml', C4: 12, E4: 3.39, F4: 6 })],
]);

const DB: MenuSnapshot = {
  supplies: [],
  categoryKeys: ['refrigerantes', 'cervejas', 'retornaveis'],
  products: [],
};

const request = (apply: boolean) => ({
  kind: 'bebidas' as const,
  file: Buffer.from('PK'),
  apply,
});

describe('SpreadsheetImportService', () => {
  it('simula sem gravar e devolve mudanças, avisos e resumo', async () => {
    const target = new FakeMenuImportTarget(DB);
    const service = new SpreadsheetImportService(
      new FakeWorkbookReader(BEVERAGES),
      target,
    );
    const result = await service.run(request(false));
    expect(result).toMatchObject({
      outcome: 'dry-run',
      changes: [
        '+ insumo "Coca Cola Lt 350ml" (un, custo 3.39)',
        '+ "Coca Cola Lt 350ml" · Refrigerantes: preço 6.00, CMV 3.39',
      ],
      summary: {
        supplies: 1,
        products: [{ category: 'Refrigerantes', count: 1 }],
      },
    });
    expect(target.written).toEqual([]);
  });

  it('com apply grava o plano', async () => {
    const target = new FakeMenuImportTarget(DB);
    const service = new SpreadsheetImportService(
      new FakeWorkbookReader(BEVERAGES),
      target,
    );
    expect((await service.run(request(true))).outcome).toBe('applied');
    expect(target.written).toHaveLength(1);
  });

  it('arquivo que não abre como planilha vira 422 com a causa', async () => {
    const service = new SpreadsheetImportService(
      new FakeWorkbookReader(null),
      new FakeMenuImportTarget(DB),
    );
    await expect(service.run(request(false))).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
