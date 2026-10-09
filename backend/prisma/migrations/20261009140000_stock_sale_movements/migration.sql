-- Baixa no estoque a cada pedido do dia (pedido do usuário, 2026-10-09; começa pelas bebidas):
-- o movimento guarda o pedido para a edição e o apagar devolverem o que ele tinha baixado.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementKind" ADD VALUE 'SALE';
ALTER TYPE "StockMovementKind" ADD VALUE 'SALE_RETURN';

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "order_id" INTEGER;

-- CreateIndex
CREATE INDEX "stock_movements_order_id_idx" ON "stock_movements"("order_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
