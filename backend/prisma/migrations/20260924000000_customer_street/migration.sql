-- Endereço do cliente vira só a rua (sem número): permite contar pedidos por bairro e por rua.
ALTER TABLE "customers" RENAME COLUMN "address" TO "street";
ALTER TABLE "orders" RENAME COLUMN "customer_address" TO "customer_street";
