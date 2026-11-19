-- Produto com a marca na ligação do item da nota (2026-11-18): "BACON SEARA PD kg" no Assaí e
-- "BACON SEARA PEDACO DEF ATC kg" no Spani viram "Bacon Seara kg", e Compras compara os mercados
-- dentro da mesma marca. Nulo = ligação antiga; a tela mostra a descrição da nota.
ALTER TABLE "vendor_item_links" ADD COLUMN "product_name" VARCHAR(60);
