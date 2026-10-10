-- Comanda impressa (pedido do usuário, 2026-10-10): número do pedido no dia e status.

-- Status: Em preparo → Saiu → Entregue (balcão sem o Saiu). Os pedidos que já existem foram
-- entregues; os novos recebem o status inicial da aplicação.
CREATE TYPE "OrderStatus" AS ENUM ('PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED');
ALTER TABLE "orders" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'DELIVERED';

-- Número no dia: os pedidos que já existem recebem 1, 2, 3… na ordem em que foram lançados.
ALTER TABLE "orders" ADD COLUMN "day_number" INTEGER;
UPDATE "orders" AS o
SET "day_number" = numbered.n
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "closing_id" ORDER BY "id") AS n
  FROM "orders"
) AS numbered
WHERE o."id" = numbered."id";
ALTER TABLE "orders" ALTER COLUMN "day_number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_closing_id_day_number_key" ON "orders"("closing_id", "day_number");
