-- Lançamento de estoque completo (sessão 8): custo pago por lote e estorno de entrada errada.
ALTER TYPE "StockMovementKind" ADD VALUE 'REVERSAL';

ALTER TABLE "stock_lots" ADD COLUMN "unit_cost" DECIMAL(10,4),
ADD COLUMN "reversed_at" TIMESTAMP(3);
