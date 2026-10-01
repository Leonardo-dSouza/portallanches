-- Origem do produto: a reimportação de uma planilha só desativa o que veio dela.
ALTER TABLE "products" ADD COLUMN "import_source" TEXT;

-- Tudo que existe nessas categorias veio da planilha de custos (3.0c); cadastros à mão vêm depois.
UPDATE "products" SET "import_source" = 'cardapio'
WHERE "category_id" IN (
    SELECT "id" FROM "product_categories" WHERE "name_key" IN ('tradicional', 'artesanal', 'adicionais')
);

-- Categorias da planilha de bebidas, uma por bloco (decisão do usuário, sessão 7).
INSERT INTO "product_categories" ("name", "name_key", "sort_order") VALUES
    ('Refrigerantes', 'refrigerantes', 4),
    ('Cervejas', 'cervejas', 5),
    ('Retornáveis', 'retornaveis', 6)
ON CONFLICT ("name_key") DO NOTHING;
