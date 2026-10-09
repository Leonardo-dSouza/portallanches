-- Histórico de preços (reajuste do cardápio, 2026-10-10): o preço novo vale a partir do dia da
-- troca, e um caixa atrasado lançado depois continua com o preço da época. Sem preenchimento: os
-- preços de hoje valem para todos os dias de antes até a primeira troca.
-- `deactivated_on`: dia em que o item saiu do cardápio (um caixa de antes ainda vende o item);
-- nulo nos inativos de hoje, que continuam bloqueados.
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deactivated_on" DATE;

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "valid_until" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_price_history_product_id_valid_until_key" ON "product_price_history"("product_id", "valid_until");

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
