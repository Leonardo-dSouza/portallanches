import { parseId, parseObject, parseText } from '../common/input-parsers.js';
import { parseQuantity } from '../common/quantity.js';

const MAX_CODE_LENGTH = 60;
const MAX_LABEL_LENGTH = 60;

/** Dados validados para vincular um item da nota fiscal a um insumo do estoque. */
export interface ItemLinkInput {
  vendorId: number;
  code: string;
  supplyId: number;
  baseQuantity: string;
  label: string | null;
}

/** Trata o rótulo opcional da embalagem da nota (vazio ou omitido vira null). */
function parseOptionalLabel(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;
  return parseText(raw, 'label', MAX_LABEL_LENGTH);
}

/**
 * Valida o corpo da requisição de cadastro ou atualização de ligação de item da nota.
 *
 * @example parseItemLinkInput({ vendorId: 1, code: '100', supplyId: 2, baseQuantity: '1' })
 */
export function parseItemLinkInput(body: unknown): ItemLinkInput {
  const fields = parseObject(body, 'ligação de item da nota');
  const vendorId = parseId(fields.vendorId, 'vendorId');
  const code = parseText(fields.code, 'code', MAX_CODE_LENGTH);
  const supplyId = parseId(fields.supplyId, 'supplyId');
  const baseQuantity = parseQuantity(
    fields.baseQuantity,
    'baseQuantity',
    false,
  );
  const label = parseOptionalLabel(fields.label);
  return { vendorId, code, supplyId, baseQuantity, label };
}
