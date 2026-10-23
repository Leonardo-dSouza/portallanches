-- Consumo interno do dia (pedido do usuário, 2026-10-20): itens do cardápio que a equipe consome
-- (janta, açaí, refri aberto para todos). Tabelas próprias, fora das vendas: não entram no
-- faturamento, no #N nem nos rankings. A baixa no estoque é a mesma do pedido, com o consumo como
-- dono do movimento. Só cria tabelas e colunas nulas: não mexe em dado existente.
-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "staff_consumption_id" INTEGER;

-- AlterTable
ALTER TABLE "stock_oversales" ADD COLUMN     "staff_consumption_id" INTEGER;

-- CreateTable
CREATE TABLE "staff_consumptions" (
    "id" SERIAL NOT NULL,
    "closing_id" INTEGER NOT NULL,
    "consumer_name" VARCHAR(40) NOT NULL,
    "consumer_key" VARCHAR(40) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_consumption_items" (
    "id" SERIAL NOT NULL,
    "staff_consumption_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "menu_number" INTEGER,
    "category_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit_cmv" DECIMAL(10,2),
    "cmv_complete" BOOLEAN NOT NULL DEFAULT false,
    "parent_item_id" INTEGER,
    "note" VARCHAR(120),

    CONSTRAINT "staff_consumption_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_consumptions_closing_id_idx" ON "staff_consumptions"("closing_id");

-- CreateIndex
CREATE INDEX "staff_consumptions_consumer_key_idx" ON "staff_consumptions"("consumer_key");

-- CreateIndex
CREATE INDEX "staff_consumption_items_staff_consumption_id_idx" ON "staff_consumption_items"("staff_consumption_id");

-- CreateIndex
CREATE INDEX "staff_consumption_items_parent_item_id_idx" ON "staff_consumption_items"("parent_item_id");

-- CreateIndex
CREATE INDEX "staff_consumption_items_product_id_idx" ON "staff_consumption_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_staff_consumption_id_idx" ON "stock_movements"("staff_consumption_id");

-- CreateIndex
CREATE INDEX "stock_oversales_staff_consumption_id_idx" ON "stock_oversales"("staff_consumption_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_staff_consumption_id_fkey" FOREIGN KEY ("staff_consumption_id") REFERENCES "staff_consumptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_consumptions" ADD CONSTRAINT "staff_consumptions_closing_id_fkey" FOREIGN KEY ("closing_id") REFERENCES "daily_closings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_consumptions" ADD CONSTRAINT "staff_consumptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_staff_consumption_id_fkey" FOREIGN KEY ("staff_consumption_id") REFERENCES "staff_consumptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "staff_consumption_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_oversales" ADD CONSTRAINT "stock_oversales_staff_consumption_id_fkey" FOREIGN KEY ("staff_consumption_id") REFERENCES "staff_consumptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- De 1 a 99, como na linha do pedido; adicional não tem observação (a observação é do item).
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_addon_without_note_check" CHECK ("parent_item_id" IS NULL OR "note" IS NULL);

-- O movimento e a venda além do saldo têm um dono só: o pedido ou o consumo.
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_single_owner_check" CHECK ("order_id" IS NULL OR "staff_consumption_id" IS NULL);
ALTER TABLE "stock_oversales" ADD CONSTRAINT "stock_oversales_single_owner_check" CHECK ("order_id" IS NULL OR "staff_consumption_id" IS NULL);
