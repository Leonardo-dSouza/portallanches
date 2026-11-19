import { BadRequestException } from '@nestjs/common';
import { parseId, parseObject, parseText } from '../common/input-parsers.js';
import { parseQuantity } from '../common/quantity.js';
import { describeReceived } from '../common/received-value.js';

const MAX_CODE_LENGTH = 60;
const MAX_LABEL_LENGTH = 60;
const MAX_PRODUCT_NAME_LENGTH = 60;
const MIN_PRODUCT_NAME_LENGTH = 2;

/** Dados validados para vincular um item da nota fiscal a um insumo do estoque. */
export interface ItemLinkInput {
  vendorId: number;
  code: string;
  supplyId: number;
  baseQuantity: string;
  label: string | null;
  /** Produto com a marca ("Bacon Seara kg"), que junta mercados diferentes no insumo. */
  productName: string;
}

/** Trata o rótulo opcional da embalagem da nota (vazio ou omitido vira null). */
function parseOptionalLabel(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;
  return parseText(raw, 'label', MAX_LABEL_LENGTH);
}

/** Produto com a marca, obrigatório: 2 a 60 caracteres depois de aparar. */
function parseProductName(raw: unknown): string {
  const name = parseText(raw, 'productName', MAX_PRODUCT_NAME_LENGTH);
  if (name.length >= MIN_PRODUCT_NAME_LENGTH) return name;
  throw new BadRequestException(
    `Campo "productName" inválido: recebido ${describeReceived(raw)}, esperado o produto com a marca, de ${MIN_PRODUCT_NAME_LENGTH} a ${MAX_PRODUCT_NAME_LENGTH} caracteres (ex.: Bacon Seara kg)`,
  );
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
  const productName = parseProductName(fields.productName);
  return { vendorId, code, supplyId, baseQuantity, label, productName };
}
