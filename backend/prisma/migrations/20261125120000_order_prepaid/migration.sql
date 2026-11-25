-- Entrega já paga (2026-11-25): só informa o motoboy, nenhum total lê.
ALTER TABLE "orders" ADD COLUMN "prepaid" BOOLEAN NOT NULL DEFAULT false;
