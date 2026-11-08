-- AlterTable: adiciona business_discount em purchase_invoices
ALTER TABLE "purchase_invoices" ADD COLUMN "business_discount" DECIMAL(10, 2);

-- Preenche com o valor de discount nas linhas existentes (pedido do usuário, 2026-11-08)
UPDATE "purchase_invoices" SET "business_discount" = "discount" WHERE "business_discount" IS NULL;

-- Põe NOT NULL após preencher as notas existentes
ALTER TABLE "purchase_invoices" ALTER COLUMN "business_discount" SET NOT NULL;
