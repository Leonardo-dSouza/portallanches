-- Código de entrega por bairro (2026-11-21): o motoboy só entrega a quem disser os 4 dígitos.
-- Aditiva: nenhum bairro nasce com o código ligado e os pedidos antigos ficam sem código.
ALTER TABLE "delivery_zones" ADD COLUMN "requires_delivery_code" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "delivery_code" CHAR(4);

ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_code_digits"
  CHECK ("delivery_code" IS NULL OR "delivery_code" ~ '^[0-9]{4}$');
