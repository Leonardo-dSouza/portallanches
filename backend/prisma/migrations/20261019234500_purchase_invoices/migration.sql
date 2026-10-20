-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "cnpj_root" CHAR(8) NOT NULL,
    "legal_name" TEXT NOT NULL,
    "nickname" VARCHAR(60),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "access_key" CHAR(44) NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "issuer_cnpj" CHAR(14) NOT NULL,
    "number" INTEGER NOT NULL,
    "series" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ NOT NULL,
    "items_total" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "payment_label" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(12,4) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_cnpj_root_key" ON "vendors"("cnpj_root");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_expense_id_key" ON "purchase_invoices"("expense_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_access_key_key" ON "purchase_invoices"("access_key");

-- CreateIndex
CREATE INDEX "purchase_invoices_issued_at_idx" ON "purchase_invoices"("issued_at");

-- CreateIndex
CREATE INDEX "purchase_invoices_vendor_id_idx" ON "purchase_invoices"("vendor_id");

-- CreateIndex
CREATE INDEX "purchase_invoice_items_invoice_id_idx" ON "purchase_invoice_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

