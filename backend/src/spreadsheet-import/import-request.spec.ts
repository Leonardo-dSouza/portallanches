import { BadRequestException } from '@nestjs/common';
import { parseImportRequest } from './import-request.js';

const XLSX_BASE64 = Buffer.from('PK fake').toString('base64');

describe('parseImportRequest', () => {
  it('aceita o tipo da planilha, o arquivo em base64 e apply opcional', () => {
    const request = parseImportRequest('bebidas', { file: XLSX_BASE64 });
    expect(request.kind).toBe('bebidas');
    expect(request.file.toString()).toBe('PK fake');
    expect(request.apply).toBe(false);
    expect(
      parseImportRequest('cardapio', { file: XLSX_BASE64, apply: true }).apply,
    ).toBe(true);
  });

  it('recusa tipo desconhecido, arquivo vazio ou que não é base64', () => {
    expect(() => parseImportRequest('ticket', { file: XLSX_BASE64 })).toThrow(
      /"ticket".*"cardapio" ou "bebidas"/,
    );
    expect(() => parseImportRequest('bebidas', { file: '' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseImportRequest('bebidas', { file: 'não é base64!' }),
    ).toThrow(/base64/);
  });
});
