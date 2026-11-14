-- Ligação de item da nota fiscal a insumo do estoque para alerta de preço base (2026-11-15).

-- CreateTable
CREATE TABLE "vendor_item_links" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "base_quantity" DECIMAL(10,3) NOT NULL,
    "label" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_item_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_item_links_vendor_id_code_key" ON "vendor_item_links"("vendor_id", "code");

-- AddForeignKey
ALTER TABLE "vendor_item_links" ADD CONSTRAINT "vendor_item_links_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item_links" ADD CONSTRAINT "vendor_item_links_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item_links" ADD CONSTRAINT "vendor_item_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
