-- CreateEnum
CREATE TYPE "OrderEventKind" AS ENUM ('CREATED', 'EDITED', 'STATUS', 'CANCELED', 'RESTORED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancel_reason" VARCHAR(200),
ADD COLUMN     "canceled_at" TIMESTAMPTZ,
ADD COLUMN     "status_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Pedidos de antes (2026-10-15): o status atual vale desde o lançamento. `created_at` é
-- timestamp sem fuso gravado em UTC pelo Prisma.
UPDATE "orders" SET "status_changed_at" = "created_at" AT TIME ZONE 'UTC';

-- CreateTable
CREATE TABLE "order_events" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" "OrderEventKind" NOT NULL,
    "manager_authorized" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_events_order_id_idx" ON "order_events"("order_id");

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
