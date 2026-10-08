-- Busca do cliente pelo nome quando o caixa não tem o telefone (pedido do usuário, 2026-10-07).
-- O backfill imita `toNeighborhoodKey` (sem acento, minúsculas, espaços colapsados) para os
-- acentos do português; daqui em diante a aplicação grava a chave.
ALTER TABLE "customers" ADD COLUMN "name_key" TEXT;

UPDATE "customers"
SET "name_key" = lower(
    regexp_replace(
        trim(translate(
            "name",
            'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
            'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        )),
        '\s+', ' ', 'g'
    )
);

ALTER TABLE "customers" ALTER COLUMN "name_key" SET NOT NULL;

CREATE INDEX "customers_name_key_idx" ON "customers"("name_key");
