-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CAIXA', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DELIVERY', 'COUNTER');

-- CreateEnum
CREATE TYPE "ClosingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DayGroup" AS ENUM ('TUE_THU', 'FRI_SUN');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" SERIAL NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "neighborhood_key" TEXT NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoboy_rate_settings" (
    "id" SERIAL NOT NULL,
    "day_group" "DayGroup" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motoboy_rate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_closings" (
    "id" SERIAL NOT NULL,
    "business_date" DATE NOT NULL,
    "status" "ClosingStatus" NOT NULL DEFAULT 'OPEN',
    "motoboy_daily_rate" DECIMAL(10,2) NOT NULL,
    "closed_by_id" INTEGER,
    "closed_at" TIMESTAMPTZ,
    "reopened_by_id" INTEGER,
    "reopened_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "closing_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "OrderType" NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "delivery_zone_id" INTEGER,
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "closing_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_name_key" ON "payment_methods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_neighborhood_key_key" ON "delivery_zones"("neighborhood_key");

-- CreateIndex
CREATE UNIQUE INDEX "motoboy_rate_settings_day_group_effective_from_key" ON "motoboy_rate_settings"("day_group", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closings_business_date_key" ON "daily_closings"("business_date");

-- CreateIndex
CREATE INDEX "orders_closing_id_idx" ON "orders"("closing_id");

-- CreateIndex
CREATE INDEX "orders_payment_method_id_idx" ON "orders"("payment_method_id");

-- CreateIndex
CREATE INDEX "expenses_closing_id_idx" ON "expenses"("closing_id");

-- AddForeignKey
ALTER TABLE "motoboy_rate_settings" ADD CONSTRAINT "motoboy_rate_settings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_reopened_by_id_fkey" FOREIGN KEY ("reopened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_closing_id_fkey" FOREIGN KEY ("closing_id") REFERENCES "daily_closings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_closing_id_fkey" FOREIGN KEY ("closing_id") REFERENCES "daily_closings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints que o Prisma não expressa (ver topo do schema.prisma).
-- Pedido de balcão não tem bairro nem taxa de entrega.
ALTER TABLE "orders" ADD CONSTRAINT "orders_counter_without_delivery_chk"
    CHECK ("type" <> 'COUNTER' OR ("delivery_zone_id" IS NULL AND "delivery_fee" = 0));

-- A lanchonete fecha na segunda-feira (ISODOW 1): não existe fechamento nesse dia.
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_not_monday_chk"
    CHECK (EXTRACT(ISODOW FROM "business_date") <> 1);
