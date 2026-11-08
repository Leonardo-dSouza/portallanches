-- Escolha obrigatória por categoria (2026-11-08: o pão do artesanal). Aditiva: nenhuma categoria
-- nasce com escolha, então nada muda até o admin ligar em Cadastros → Categorias.
ALTER TABLE "product_categories" ADD COLUMN "choice_category_id" INTEGER;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_choice_category_id_fkey"
  FOREIGN KEY ("choice_category_id") REFERENCES "product_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
-- A categoria não pede escolha de si mesma (como os adicionais).
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_choice_not_self_check"
  CHECK ("choice_category_id" <> "id");

-- Ordem das opções dentro da categoria de escolha: a tecla 1, 2, 3 do caixa.
ALTER TABLE "products" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- A escolha grava como linha filha do item, igual ao adicional, marcada para a tela.
ALTER TABLE "order_items" ADD COLUMN "is_choice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff_consumption_items" ADD COLUMN "is_choice" BOOLEAN NOT NULL DEFAULT false;

-- Só linha filha é escolha.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_choice_is_child"
  CHECK ("parent_item_id" IS NOT NULL OR NOT "is_choice");
ALTER TABLE "staff_consumption_items" ADD CONSTRAINT "staff_consumption_items_choice_is_child"
  CHECK ("parent_item_id" IS NOT NULL OR NOT "is_choice");
