import type { MenuCorrections } from '../menu-import/menu-types.js';
import beverageCorrections from './config/bebidas-correcoes.json' with { type: 'json' };
import cardapioCorrections from './config/cardapio-correcoes.json' with { type: 'json' };
import cardapioMapping from './config/cardapio-mapeamento.json' with { type: 'json' };

// Configuração das planilhas importadas pela tela do admin e pela linha de comando. Antes
// ficava em docs/dataset-portallanches/ (fora do git); veio para o código na sessão 7 para
// a importação pelo navegador funcionar igual em dev e em produção.

/**
 * Como a planilha de custos (`plan_custo_*.xlsm`) vira insumos e lanches; validado por
 * `parseMenuMapping` na hora de usar. Formato no README ("Importar a planilha de custos").
 */
export const CARDAPIO_MAPPING: unknown = cardapioMapping;

/** Correções por célula da planilha de custos (ver `MenuCorrections`). */
export const CARDAPIO_CORRECTIONS: MenuCorrections = cardapioCorrections;

/**
 * Correções por célula da planilha de bebidas. `Plan1!B44`: erro de digitação ("pertra")
 * na planilha recebida em 2026-09-30.
 */
export const BEVERAGE_CORRECTIONS: MenuCorrections = beverageCorrections;
