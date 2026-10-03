-- Pedido por item (Entregável 3, sessão 10). O valor do pedido (orders.amount) passa a ser a soma
-- dos itens + a taxa de entrega, calculada no servidor; o relatório continua somando amount.
-- Nome, número e categoria são copiados: mudar o cardápio não altera pedido antigo. Preço e CMV
-- também são da época (decisão de 2026-09-30). Pedidos importados da planilha ficam sem itens.
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "menu_number" INTEGER,
    "category_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit_cmv" DECIMAL(10,2),
    "cmv_complete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99)
);

CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
