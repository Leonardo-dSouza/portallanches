-- Conta aberta e troco (pedido do usuário, 2026-10-10).

-- Forma "Dinheiro": só ela aceita o "Troco para". Marca pelo nome do cadastro (conferir o nome
-- na produção antes do deploy: o admin renomeia pela tela).
ALTER TABLE "payment_methods" ADD COLUMN "is_cash" BOOLEAN NOT NULL DEFAULT false;
UPDATE "payment_methods" SET "is_cash" = true WHERE "name" = 'Dinheiro';

-- "Troco para" da entrega paga em dinheiro.
ALTER TABLE "orders" ADD COLUMN "change_for" DECIMAL(10,2);
