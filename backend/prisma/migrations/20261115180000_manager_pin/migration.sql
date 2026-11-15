-- Código do gerente (S-04 do mapa de segurança): PIN por admin e quem liberou cada passo do pedido.
-- AlterTable
ALTER TABLE "users" ADD COLUMN "manager_pin_hash" TEXT;

-- AlterTable
ALTER TABLE "order_events" ADD COLUMN "manager_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
