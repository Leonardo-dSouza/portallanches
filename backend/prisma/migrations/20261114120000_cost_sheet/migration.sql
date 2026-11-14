-- Planilha de custos (2026-11-14): preço base, ficha de produção, markup de PV e histórico de alterações.

-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "fixed_cost_percent" DECIMAL(5,2),
ADD COLUMN     "profit_percent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "supplies" ADD COLUMN     "base_label" TEXT,
ADD COLUMN     "base_price" DECIMAL(10,2),
ADD COLUMN     "base_quantity" DECIMAL(10,3);

-- CreateTable
CREATE TABLE "supply_recipes" (
    "id" SERIAL NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "yield_quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "supply_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_recipe_items" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "supply_recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_change_sets" (
    "id" SERIAL NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,

    CONSTRAINT "cost_change_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_cost_history" (
    "id" SERIAL NOT NULL,
    "change_set_id" INTEGER NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "old_unit_cost" DECIMAL(10,4),
    "new_unit_cost" DECIMAL(10,4),
    "old_base_price" DECIMAL(10,2),
    "new_base_price" DECIMAL(10,2),
    "base_quantity" DECIMAL(10,3),
    "base_label" TEXT,

    CONSTRAINT "supply_cost_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supply_recipes_supply_id_key" ON "supply_recipes"("supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "supply_recipe_items_recipe_id_supply_id_key" ON "supply_recipe_items"("recipe_id", "supply_id");

-- CreateIndex
CREATE INDEX "supply_cost_history_supply_id_change_set_id_idx" ON "supply_cost_history"("supply_id", "change_set_id");

-- AddForeignKey
ALTER TABLE "supply_recipes" ADD CONSTRAINT "supply_recipes_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_recipe_items" ADD CONSTRAINT "supply_recipe_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "supply_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_recipe_items" ADD CONSTRAINT "supply_recipe_items_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_change_sets" ADD CONSTRAINT "cost_change_sets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_cost_history" ADD CONSTRAINT "supply_cost_history_change_set_id_fkey" FOREIGN KEY ("change_set_id") REFERENCES "cost_change_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_cost_history" ADD CONSTRAINT "supply_cost_history_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill supplies: padrão para insumos sem embalagem ou com múltiplas embalagens
UPDATE "supplies"
SET "base_quantity" = 1,
    "base_label" = NULL,
    "base_price" = ROUND("unit_cost", 2)
WHERE "unit_cost" IS NOT NULL;

-- Backfill supplies: insumos com exatamente uma embalagem usam a conversão dela
WITH single_pkg AS (
    SELECT "supply_id", MIN("name") AS "name", MIN("quantity") AS "quantity"
    FROM "supply_packages"
    GROUP BY "supply_id"
    HAVING COUNT(*) = 1
)
UPDATE "supplies" s
SET "base_quantity" = sp.quantity,
    "base_label" = sp.name,
    "base_price" = ROUND(s.unit_cost * sp.quantity, 2)
FROM single_pkg sp
WHERE s.id = sp.supply_id
  AND s.unit_cost IS NOT NULL;

-- Backfill product_categories: percentuais de custo fixo e lucro sugerido para formação de PV
UPDATE "product_categories"
SET "fixed_cost_percent" = 41.07,
    "profit_percent" = 16.00
WHERE "name_key" IN ('tradicional', 'adicionais', 'porcoes');

UPDATE "product_categories"
SET "fixed_cost_percent" = 41.07,
    "profit_percent" = 12.00
WHERE "name_key" = 'artesanal';
