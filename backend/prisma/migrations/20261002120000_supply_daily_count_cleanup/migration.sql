-- Contagem do dia (sessão 9): insumo que precisa ser contado todo dia; a Situação avisa se faltou.
ALTER TABLE "supplies" ADD COLUMN "daily_count" BOOLEAN NOT NULL DEFAULT false;

-- Revisão dos insumos feita na lanchonete (sessão 9, 2026-10-02). Tudo pelo name_key
-- (minúsculas, sem acento), então em banco novo, ainda sem insumos, nada acontece.
UPDATE "supplies" SET "daily_count" = true
WHERE "name_key" IN ('alface', 'bacon', 'calabresa', 'ovo', 'tomate');

-- Seções que faltavam ou estavam erradas.
UPDATE "supplies" SET "section_id" = (SELECT "id" FROM "supply_sections" WHERE "name_key" = 'alimentos')
WHERE "name_key" = 'batata palha';
UPDATE "supplies" SET "section_id" = (SELECT "id" FROM "supply_sections" WHERE "name_key" = 'refrigerantes')
WHERE "name_key" IN ('coca cola 2l', 'coca cola 200ml');
UPDATE "supplies" SET "section_id" = (SELECT "id" FROM "supply_sections" WHERE "name_key" = 'cervejas')
WHERE "name_key" IN ('original 300ml retornavel', 'original litrao retornavel', 'skol 300ml retornavel', 'skol litrao retornavel');
UPDATE "supplies" SET "section_id" = (SELECT "id" FROM "supply_sections" WHERE "name_key" = 'embalagens')
WHERE "name_key" IN ('papel acoplado', 'hamburgueira gourmet');

-- Nomes que a equipe usa. A config da importação (cardapio-mapeamento.json) mudou junto,
-- senão a próxima importação recriaria os nomes antigos.
UPDATE "supplies" SET "name" = 'Caixinha para artesanal', "name_key" = 'caixinha para artesanal', "updated_at" = NOW()
WHERE "name_key" = 'hamburgueira gourmet';
UPDATE "supplies" SET "name" = 'Pão de hambúrguer', "name_key" = 'pao de hamburguer', "updated_at" = NOW()
WHERE "name_key" = 'pao hamburguer/hot dog';

-- Pão de hot dog é outro pão na contagem e na compra, com o mesmo preço (célula E4 da planilha).
INSERT INTO "supplies" ("name", "name_key", "count_unit", "unit_cost", "deduct_on_sale", "section_id", "updated_at")
SELECT 'Pão de hot dog', 'pao de hot dog', s."count_unit", s."unit_cost", true, s."section_id", NOW()
FROM "supplies" s WHERE s."name_key" = 'pao de hamburguer'
ON CONFLICT ("name_key") DO NOTHING;
UPDATE "product_components" c SET "supply_id" = (SELECT "id" FROM "supplies" WHERE "name_key" = 'pao de hot dog')
FROM "products" p
WHERE p."id" = c."product_id"
  AND lower(p."name") IN ('hot dog', 'hot bacon', 'hot frango')
  AND c."supply_id" = (SELECT "id" FROM "supplies" WHERE "name_key" = 'pao de hamburguer');

-- Queijo bandeja e queijo peça são o mesmo queijo: fica o "Queijo peça", com a baixa de 36 g
-- por lanche que era da bandeja. O histórico de lotes da bandeja fica nela (inativa).
UPDATE "product_components" c SET "supply_id" = (SELECT "id" FROM "supplies" WHERE "name_key" = 'queijo peca')
WHERE c."supply_id" = (SELECT "id" FROM "supplies" WHERE "name_key" = 'queijo bandeja')
  AND NOT EXISTS (
    SELECT 1 FROM "product_components" o
    WHERE o."product_id" = c."product_id"
      AND o."supply_id" = (SELECT "id" FROM "supplies" WHERE "name_key" = 'queijo peca')
  );
UPDATE "supplies" SET "deduct_on_sale" = true, "updated_at" = NOW() WHERE "name_key" = 'queijo peca';

-- Ocultos: juntados com outro insumo, fora de uso ou "não sabem o que é". Nada é apagado
-- (regra do projeto); Molho verde e Colher de molho continuam no CMV, só saem do estoque.
UPDATE "supplies" SET "active" = false, "updated_at" = NOW()
WHERE "name_key" IN (
  'queijo bandeja', 'file de frango fatiado', 'azeitona', 'milho', 'pao australiano',
  'fanta uva 2l', 'fanta uva 350ml', 'skol latao', 'skol garrafinha',
  'colher de molho', 'molho verde'
);
