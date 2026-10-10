-- Adicionais presos ao lanche (pedido do usuário, 2026-10-09): cada categoria diz de qual
-- categoria vêm os adicionais dos seus itens. Já nasce Tradicional e Artesanal → Adicionais e
-- Açaí → Adicionais do açaí (chaves conferidas na produção); o resto o dono liga pela tela.
-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "addon_category_id" INTEGER;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_addon_category_id_fkey" FOREIGN KEY ("addon_category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A categoria não aponta para si mesma.
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_addon_not_self_check" CHECK ("addon_category_id" <> "id");

UPDATE "product_categories"
SET "addon_category_id" = (SELECT "id" FROM "product_categories" WHERE "name_key" = 'adicionais')
WHERE "name_key" IN ('tradicional', 'artesanal');

UPDATE "product_categories"
SET "addon_category_id" = (SELECT "id" FROM "product_categories" WHERE "name_key" = 'adicionais do acai')
WHERE "name_key" = 'acai';
