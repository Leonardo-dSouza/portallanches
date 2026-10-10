-- Venda além do estoque do sistema (decisão do usuário, 2026-10-09): o caixa avisa e deixa vender;
-- a diferença fica "Conferir" na Situação até a próxima entrada (que desconta) ou contagem.
-- `app_settings`: opções que o dono muda pela tela; o caixa mostra o saldo abaixo de 6 por padrão.
-- CreateTable
CREATE TABLE "stock_oversales" (
    "id" SERIAL NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "quantity" DECIMAL(10,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_oversales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "stock_oversales_supply_id_idx" ON "stock_oversales"("supply_id");

-- CreateIndex
CREATE INDEX "stock_oversales_order_id_idx" ON "stock_oversales"("order_id");

-- AddForeignKey
ALTER TABLE "stock_oversales" ADD CONSTRAINT "stock_oversales_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_oversales" ADD CONSTRAINT "stock_oversales_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Padrão pedido pelo usuário: mostrar o saldo no caixa quando tiver menos de 6.
INSERT INTO "app_settings" ("key", "value", "updated_at") VALUES ('low_stock_warning', '6', CURRENT_TIMESTAMP);
