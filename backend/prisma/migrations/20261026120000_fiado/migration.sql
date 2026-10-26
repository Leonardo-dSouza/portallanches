-- Fiado, pagar depois (pedido do usuário, 2026-10-25). Só acrescenta: colunas novas com padrão,
-- uma tabela nova e dois DROP NOT NULL; nenhum dado existente muda.

-- Histórico do pedido: recebido, estornado e previsão remarcada.
ALTER TYPE "OrderEventKind" ADD VALUE 'FIADO_PAYMENT';
ALTER TYPE "OrderEventKind" ADD VALUE 'FIADO_PAYMENT_CANCELED';
ALTER TYPE "OrderEventKind" ADD VALUE 'FIADO_DUE_DATE';

-- Cliente do balcão (fiado) é só nome e telefone: rua e bairro passam a ser opcionais. A regra de
-- vir tudo junto (rua + número + bairro) fica na aplicação.
ALTER TABLE "customers" ALTER COLUMN "street" DROP NOT NULL,
ALTER COLUMN "delivery_zone_id" DROP NOT NULL;

-- Previsão do pagamento do fiado (opcional).
ALTER TABLE "orders" ADD COLUMN     "fiado_due_date" DATE;

-- Forma "Fiado": o pedido fica fora da gaveta e é cobrado depois. Nasce ativa, no fim da lista
-- (a tecla é o próximo número). Conferir o nome na produção antes do deploy (lição de
-- 2026-10-08): se já existir uma forma "Fiado", ela só ganha a marca.
ALTER TABLE "payment_methods" ADD COLUMN     "is_fiado" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "payment_methods" ("name", "is_fiado", "sort_order", "updated_at")
SELECT 'Fiado', true, COALESCE(MAX("sort_order"), 0) + 1, NOW() FROM "payment_methods"
ON CONFLICT ("name") DO UPDATE SET "is_fiado" = true;

-- CreateTable
CREATE TABLE "fiado_payments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "closing_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "extra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_method_id" INTEGER NOT NULL,
    "payment_mode" "PaymentMode",
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMPTZ,
    "canceled_by_id" INTEGER,
    "cancel_reason" VARCHAR(200),

    CONSTRAINT "fiado_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiado_payments_order_id_idx" ON "fiado_payments"("order_id");

-- CreateIndex
CREATE INDEX "fiado_payments_closing_id_idx" ON "fiado_payments"("closing_id");

-- AddForeignKey
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_closing_id_fkey" FOREIGN KEY ("closing_id") REFERENCES "daily_closings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_canceled_by_id_fkey" FOREIGN KEY ("canceled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- O recebimento abate algo do pedido (de R$ 0,01 até o que falta, conferido na aplicação) e o
-- adicional nunca é negativo; o estorno leva quem, quando e o motivo juntos.
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_extra_not_negative_check" CHECK ("extra" >= 0);
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_cancel_complete_check" CHECK (("canceled_at" IS NULL) = ("canceled_by_id" IS NULL) AND ("canceled_at" IS NULL) = ("cancel_reason" IS NULL));
