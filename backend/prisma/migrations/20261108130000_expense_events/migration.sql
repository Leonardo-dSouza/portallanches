-- CreateEnum
CREATE TYPE "ExpenseEventKind" AS ENUM ('CREATED', 'EDITED', 'CANCELED', 'RESTORED');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "canceled_at" TIMESTAMPTZ,
ADD COLUMN "canceled_by_id" INTEGER;

-- CreateTable
CREATE TABLE "expense_events" (
    "id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" "ExpenseEventKind" NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_events_expense_id_idx" ON "expense_events"("expense_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_canceled_by_id_fkey" FOREIGN KEY ("canceled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_events" ADD CONSTRAINT "expense_events_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_events" ADD CONSTRAINT "expense_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
