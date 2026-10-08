-- Maquininhas (pedido do usuário, 2026-10-07): "Maquininha Tom" e "Maquininha PagBank" pedem o
-- meio usado (crédito, débito ou PIX). "Cartão de débito/crédito" deixam de ser usados.
CREATE TYPE "PaymentMode" AS ENUM ('CREDIT', 'DEBIT', 'PIX');

ALTER TABLE "payment_methods" ADD COLUMN "is_card_terminal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders" ADD COLUMN "payment_mode" "PaymentMode";

INSERT INTO "payment_methods" ("name", "is_card_terminal", "updated_at") VALUES
    ('Maquininha Tom', true, NOW()),
    ('Maquininha PagBank', true, NOW())
ON CONFLICT ("name") DO NOTHING;

UPDATE "payment_methods" SET "active" = false
WHERE "name" IN ('Cartão de débito', 'Cartão de crédito');

-- Teclas do caixa: 1 Dinheiro, 2 PIX, 3 Tom, 4 PagBank; as demais formas vêm depois.
UPDATE "payment_methods" SET "sort_order" = CASE "name"
    WHEN 'Dinheiro' THEN 0
    WHEN 'PIX' THEN 1
    WHEN 'Maquininha Tom' THEN 2
    WHEN 'Maquininha PagBank' THEN 3
    ELSE "sort_order" + 10
END;
