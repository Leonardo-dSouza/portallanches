-- COMER / VIAGEM no pedido do balcão (2026-11-08: a chapa precisa saber se embala).
CREATE TYPE "DiningOption" AS ENUM ('EAT_IN', 'TAKEAWAY');

ALTER TABLE "orders" ADD COLUMN "dining_option" "DiningOption";
