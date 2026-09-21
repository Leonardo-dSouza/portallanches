-- A lanchonete pode decidir abrir na segunda-feira: o bloqueio no banco deixa de existir.
ALTER TABLE "daily_closings" DROP CONSTRAINT "daily_closings_not_monday_chk";
