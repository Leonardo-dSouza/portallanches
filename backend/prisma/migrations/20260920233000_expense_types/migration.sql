-- Gastos passam a referenciar um tipo parametrizável (obrigatório).
-- Só existiam gastos de teste (confirmado pelo usuário), então são apagados
-- em vez de migrados para um tipo genérico.
DELETE FROM "expenses";

-- CreateTable
CREATE TABLE "expense_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_types_name_key_key" ON "expense_types"("name_key");

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "expense_type_id" INTEGER NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "expenses_expense_type_id_idx" ON "expenses"("expense_type_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
