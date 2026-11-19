-- Meta de lucro própria do lanche (2026-11-18): o X Burguer da planilha usa 10% e os outros
-- tradicionais 16%. Nulo = usa a meta da categoria. Aditiva: nada muda nos produtos que existem.
ALTER TABLE "products" ADD COLUMN "profit_percent" DECIMAL(5,2);
