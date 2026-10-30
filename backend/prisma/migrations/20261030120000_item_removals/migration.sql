-- Ingredientes tirados do lanche (2026-10-30): saem da baixa e do CMV, o preço fica igual.
-- Aditiva: as linhas antigas ficam com a lista vazia, e o "s/ovo" na observação não é convertido.
ALTER TABLE "order_items" ADD COLUMN "removals" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "staff_consumption_items" ADD COLUMN "removals" JSONB NOT NULL DEFAULT '[]';

-- Adicional não tem retirada, como não tem observação.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_addon_no_removals"
  CHECK ("parent_item_id" IS NULL OR "removals" = '[]'::jsonb);
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_addon_no_removals"
  CHECK ("parent_item_id" IS NULL OR "removals" = '[]'::jsonb);
