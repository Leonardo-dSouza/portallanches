-- Pedidos do iFood (2026-11-23): 3º tipo de pedido, preço iFood por produto e a forma "iFood".
-- Aditiva: nenhum pedido ou produto antigo muda; o rollback de código segue possível.
ALTER TYPE "OrderType" ADD VALUE 'IFOOD';

ALTER TABLE "products" ADD COLUMN "ifood_price" DECIMAL(10,2);
ALTER TABLE "products" ADD CONSTRAINT "products_ifood_price_not_negative"
  CHECK ("ifood_price" IS NULL OR "ifood_price" >= 0);

ALTER TABLE "orders" ADD COLUMN "ifood_code" VARCHAR(10);
ALTER TABLE "orders" ADD COLUMN "ifood_commission_percent" DECIMAL(5,2);
ALTER TABLE "orders" ADD CONSTRAINT "orders_ifood_commission_range"
  CHECK ("ifood_commission_percent" IS NULL OR ("ifood_commission_percent" >= 0 AND "ifood_commission_percent" <= 100));

ALTER TABLE "payment_methods" ADD COLUMN "is_ifood" BOOLEAN NOT NULL DEFAULT false;

-- A forma do pedido iFood. Só uma pode existir (índice parcial), e ela nunca é dinheiro,
-- maquininha nem fiado.
CREATE UNIQUE INDEX "payment_methods_single_ifood" ON "payment_methods" ("is_ifood") WHERE "is_ifood";
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_ifood_alone"
  CHECK (NOT "is_ifood" OR (NOT "is_cash" AND NOT "is_card_terminal" AND NOT "is_fiado"));

INSERT INTO "payment_methods" ("name", "active", "sort_order", "is_ifood", "updated_at")
VALUES ('iFood', true, 99, true, now())
ON CONFLICT ("name") DO UPDATE SET "is_ifood" = true, "active" = true;
