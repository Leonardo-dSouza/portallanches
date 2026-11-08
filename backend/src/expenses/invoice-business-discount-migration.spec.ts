import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveBusinessDiscount } from './outside-items.js';

describe('Migration invoice_business_discount (2026-11-08)', () => {
  it('o arquivo SQL da migration adiciona a coluna, preenche as notas existentes com o desconto e põe NOT NULL', () => {
    const migrationPath = resolve(
      import.meta.dirname,
      '../../prisma/migrations/20261108120000_invoice_business_discount/migration.sql',
    );
    const sql = readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain(
      'ALTER TABLE "purchase_invoices" ADD COLUMN "business_discount" DECIMAL(10, 2);',
    );
    expect(sql).toContain(
      'UPDATE "purchase_invoices" SET "business_discount" = "discount" WHERE "business_discount" IS NULL;',
    );
    expect(sql).toContain(
      'ALTER TABLE "purchase_invoices" ALTER COLUMN "business_discount" SET NOT NULL;',
    );
  });

  it('migration de dado: o padrão sem valor informado ou sem item de fora é o desconto inteiro', () => {
    expect(resolveBusinessDiscount([], undefined, '7.19')).toBe('7.19');
    expect(resolveBusinessDiscount([1], undefined, '7.19')).toBe('7.19');
    expect(resolveBusinessDiscount([], '0.00', '7.19')).toBe('7.19');
  });
});
