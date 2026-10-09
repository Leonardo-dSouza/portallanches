import { BEVERAGE_LAYOUT } from '../beverage-import/beverage-layout.js';
import { parseMenuMapping } from '../menu-import/menu-mapping.js';
import { CARDAPIO_MAPPING } from '../spreadsheet-import/import-configs.js';
import { importedCategoryKeys } from './imported-categories.js';

describe('importedCategoryKeys', () => {
  it('junta as categorias da planilha de custos e da de bebidas, pela chave', () => {
    const keys = importedCategoryKeys(
      parseMenuMapping(CARDAPIO_MAPPING),
      BEVERAGE_LAYOUT,
    );
    expect([...keys].sort()).toEqual([
      'adicionais',
      'artesanal',
      'cervejas',
      'refrigerantes',
      'retornaveis',
      'tradicional',
    ]);
  });
});
