-- AlterTable
ALTER TABLE "purchase_invoices" ADD COLUMN "stock_entered_at" TIMESTAMPTZ,
ADD COLUMN "stock_entered_by_id" INTEGER;

-- AlterTable
ALTER TABLE "stock_lots" ADD COLUMN "invoice_item_id" INTEGER;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_stock_entered_by_id_fkey" FOREIGN KEY ("stock_entered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "purchase_invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
