-- Itens da nota que não são da lanchonete (pedido do usuário, 2026-10-25): pão de forma, massa
-- de tomate e outras compras de casa que vêm no mesmo cupom. Saem do valor do gasto e de
-- Compras → Preços. Só cria a coluna com padrão falso: as notas já lançadas continuam inteiras.
-- AlterTable
ALTER TABLE "purchase_invoice_items" ADD COLUMN     "outside_business" BOOLEAN NOT NULL DEFAULT false;
