import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseChoice,
  parseObject,
} from '../common/input-parsers.js';
import type { ImportSource } from '../menu-import/menu-types.js';

export const SPREADSHEET_KINDS: readonly ImportSource[] = [
  'cardapio',
  'bebidas',
];

// A planilha de custos tem ~160 KB; 5 MB sobra e ainda barra arquivo errado muito grande.
export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export interface ImportRequest {
  kind: ImportSource;
  file: Buffer;
  /** Falso = só simulação; nada é gravado. */
  apply: boolean;
}

function parseBase64File(raw: unknown): Buffer {
  const text = typeof raw === 'string' ? raw.trim() : '';
  const file = BASE64.test(text) ? Buffer.from(text, 'base64') : null;
  if (file && file.length > 0 && file.length <= MAX_SPREADSHEET_BYTES)
    return file;
  throw new BadRequestException(
    `Campo "file" inválido: recebido ${text.length} caracteres, esperado a planilha em base64 com até ${MAX_SPREADSHEET_BYTES / 1024 / 1024} MB`,
  );
}

/**
 * Valida o pedido de `POST /imports/:kind`: `{ file: '<base64>', apply?: boolean }`.
 *
 * @example parseImportRequest('bebidas', { file: 'UEsDB...', apply: false })
 */
export function parseImportRequest(kind: string, body: unknown): ImportRequest {
  const fields = parseObject(body, 'importação de planilha');
  return {
    kind: parseChoice(kind, 'tipo da planilha', SPREADSHEET_KINDS),
    file: parseBase64File(fields.file),
    apply:
      fields.apply === undefined ? false : parseBoolean(fields.apply, 'apply'),
  };
}
