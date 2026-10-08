-- Número da casa e referência no endereço da entrega (pedido do usuário, 2026-10-08): a comanda
-- vai sair impressa do caixa para a chapa e o motoboy. O pedido guarda a cópia do dia, como a rua.
-- Nulos nos clientes e pedidos de antes; a API passa a exigir o número em todo cadastro novo.
ALTER TABLE "customers" ADD COLUMN "number" TEXT;
ALTER TABLE "customers" ADD COLUMN "reference" TEXT;

ALTER TABLE "orders" ADD COLUMN "customer_number" TEXT;
ALTER TABLE "orders" ADD COLUMN "customer_reference" TEXT;
