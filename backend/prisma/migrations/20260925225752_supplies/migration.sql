-- CreateTable
CREATE TABLE "supplies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "count_unit" TEXT NOT NULL,
    "min_stock" DECIMAL(10,3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_packages" (
    "id" SERIAL NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "supply_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplies_name_key_key" ON "supplies"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "supply_packages_supply_id_name_key" ON "supply_packages"("supply_id", "name");

-- AddForeignKey
ALTER TABLE "supply_packages" ADD CONSTRAINT "supply_packages_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
