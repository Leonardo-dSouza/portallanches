-- AlterTable
ALTER TABLE "supplies" ADD COLUMN     "deduct_on_sale" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unit_cost" DECIMAL(10,4);
