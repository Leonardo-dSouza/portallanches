-- Card 7 (2026-11-12): conferência da gaveta no fechamento (abertura, contagem e tolerância).

-- AlterTable
ALTER TABLE "daily_closings" ADD COLUMN     "counted_at" TIMESTAMPTZ,
ADD COLUMN     "counted_by_id" INTEGER,
ADD COLUMN     "opened_at" TIMESTAMPTZ,
ADD COLUMN     "opened_by_id" INTEGER,
ADD COLUMN     "opening_cash" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "closing_counts" (
    "id" SERIAL NOT NULL,
    "closing_id" INTEGER NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "closing_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "closing_counts_closing_id_payment_method_id_key" ON "closing_counts"("closing_id", "payment_method_id");

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_counted_by_id_fkey" FOREIGN KEY ("counted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closing_counts" ADD CONSTRAINT "closing_counts_closing_id_fkey" FOREIGN KEY ("closing_id") REFERENCES "daily_closings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closing_counts" ADD CONSTRAINT "closing_counts_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
