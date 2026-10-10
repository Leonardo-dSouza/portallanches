-- Contador do número do pedido no dia (2026-10-10): só cresce, para o pedido novo nunca
-- repetir o número de um que foi apagado (a comanda dele pode já ter sido impressa).
ALTER TABLE "daily_closings" ADD COLUMN "last_order_number" INTEGER NOT NULL DEFAULT 0;

UPDATE "daily_closings" AS c
SET "last_order_number" = numbered.last
FROM (
  SELECT "closing_id", MAX("day_number") AS last FROM "orders" GROUP BY "closing_id"
) AS numbered
WHERE c."id" = numbered."closing_id";
