-- Adicional e observação no lanche (pedido do usuário, 2026-10-09): o adicional vira linha filha
-- do item (mantém produto, preço, CMV e categoria próprios, então "Vendas por categoria" segue
-- mostrando os Adicionais) e o item ganha a observação que vai para a comanda.
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "note" VARCHAR(120),
ADD COLUMN     "parent_item_id" INTEGER;

-- CreateIndex
CREATE INDEX "order_items_parent_item_id_idx" ON "order_items"("parent_item_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adicional não tem observação (a observação é do item).
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_addon_without_note_check" CHECK ("parent_item_id" IS NULL OR "note" IS NULL);
