-- Pedidos importados da planilha histórica não têm tipo, forma de pagamento nem taxa:
-- ficam nulos em vez de receber valores inventados. A CHECK de balcão continua válida
-- (com `type` nulo o predicado dá NULL, que o Postgres aceita).
ALTER TABLE "orders" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "payment_method_id" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "delivery_fee" DROP NOT NULL;
