-- Combos fixos (pedido do usuário, 2026-10-09: "1 X Salada + 1 Guaraná lata" a R$ 19,00): o
-- combo é um produto com preço próprio e itens fixos; CMV e baixa saem dos itens.
-- CreateTable
CREATE TABLE "product_bundle_items" (
    "id" SERIAL NOT NULL,
    "bundle_product_id" INTEGER NOT NULL,
    "item_product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "product_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_bundle_items_item_product_id_idx" ON "product_bundle_items"("item_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_bundle_items_bundle_product_id_item_product_id_key" ON "product_bundle_items"("bundle_product_id", "item_product_id");

-- AddForeignKey
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundle_product_id_fkey" FOREIGN KEY ("bundle_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_item_product_id_fkey" FOREIGN KEY ("item_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Quantidade de 1 a 99 (como a linha do pedido) e o combo não contém a si mesmo.
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_not_self_check" CHECK ("bundle_product_id" <> "item_product_id");
