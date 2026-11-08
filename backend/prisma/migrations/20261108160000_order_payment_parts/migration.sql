-- Parte do pagamento quando dividido entre duas ou mais formas (card 2, 2026-11-08).
-- Só pedidos divididos têm linhas; pedido de uma forma continua nas colunas de `orders`.

-- CreateTable
CREATE TABLE "order_payment_parts" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "payment_mode" "PaymentMode",
    "amount" DECIMAL(10,2) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "order_payment_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_payment_parts_order_id_idx" ON "order_payment_parts"("order_id");

-- AddForeignKey
ALTER TABLE "order_payment_parts" ADD CONSTRAINT "order_payment_parts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_parts" ADD CONSTRAINT "order_payment_parts_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
