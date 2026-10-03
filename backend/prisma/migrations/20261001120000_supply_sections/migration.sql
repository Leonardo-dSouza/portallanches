-- Seções do estoque (sessão 8): lugar do insumo na lanchonete, para filtrar e contar na ordem da prateleira.
CREATE TABLE "supply_sections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "supply_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supply_sections_name_key_key" ON "supply_sections"("name_key");

ALTER TABLE "supplies" ADD COLUMN "section_id" INTEGER;

ALTER TABLE "supplies" ADD CONSTRAINT "supplies_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "supply_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Colunas da anotação de estoque do usuário (sessão 8), na ordem em que ele as listou.
INSERT INTO "supply_sections" ("name", "name_key", "sort_order") VALUES
    ('Geladeira', 'geladeira', 1),
    ('Alimentos', 'alimentos', 2),
    ('Refrigerantes', 'refrigerantes', 3),
    ('Cervejas', 'cervejas', 4),
    ('Armário', 'armario', 5),
    ('Açaí', 'acai', 6),
    ('Embalagens', 'embalagens', 7),
    ('Papelaria e sacolas', 'papelaria e sacolas', 8),
    ('Limpeza', 'limpeza', 9)
ON CONFLICT ("name_key") DO NOTHING;
