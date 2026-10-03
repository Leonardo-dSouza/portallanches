-- Cardápio do açaí (valores passados pelo usuário em 2026-10-02). Fora da planilha de custos:
-- import_source nulo, então a importação nunca desativa estes itens. Sem composição por
-- enquanto (o CMV aparece incompleto até alguém cadastrar os insumos).
INSERT INTO "product_categories" ("name", "name_key", "sort_order") VALUES
    ('Açaí', 'acai', 7),
    ('Adicionais do açaí', 'adicionais do acai', 8)
ON CONFLICT ("name_key") DO NOTHING;

INSERT INTO "products" ("category_id", "name", "name_key", "sale_price", "updated_at")
SELECT c."id", item."name", item."name_key", item."price", NOW()
FROM (VALUES
    ('acai', 'Açaí 300ml', 'acai 300ml', 8.50),
    ('acai', 'Açaí 500ml', 'acai 500ml', 12.50),
    ('acai', 'Açaí 700ml', 'acai 700ml', 16.00),
    ('adicionais do acai', 'Leite condensado', 'leite condensado', 3.50),
    ('adicionais do acai', 'Leite em pó', 'leite em po', 3.50),
    ('adicionais do acai', 'Paçoca', 'pacoca', 3.50),
    ('adicionais do acai', 'Chocoball', 'chocoball', 3.50),
    ('adicionais do acai', 'Confete', 'confete', 3.50),
    ('adicionais do acai', 'Banana', 'banana', 3.50),
    ('adicionais do acai', 'Granola', 'granola', 3.50),
    ('adicionais do acai', 'Granulado', 'granulado', 3.50),
    ('adicionais do acai', 'Ovomaltine', 'ovomaltine', 4.00),
    ('adicionais do acai', 'Bis', 'bis', 5.00),
    ('adicionais do acai', 'Oreo', 'oreo', 5.00),
    ('adicionais do acai', 'Morango', 'morango', 5.00),
    ('adicionais do acai', 'Kiwi', 'kiwi', 5.00),
    ('adicionais do acai', 'Mousse de maracujá', 'mousse de maracuja', 5.00),
    ('adicionais do acai', 'Mousse de morango', 'mousse de morango', 5.00)
) AS item("category_key", "name", "name_key", "price")
JOIN "product_categories" c ON c."name_key" = item."category_key"
ON CONFLICT ("category_id", "name_key") DO NOTHING;
