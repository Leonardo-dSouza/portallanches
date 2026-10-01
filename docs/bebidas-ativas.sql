BEGIN;
-- Pedido do usuário (sessão 7): à venda só estas bebidas; o resto da planilha fica desativado.
WITH keep(name_key) AS (VALUES
  ('coca cola 2l'), ('coca cola 600ml'), ('coca cola lt 350ml'), ('guaranita 600ml'),
  ('it limao 2l'), ('it laranja 2l'), ('it guarana 2l'),
  ('heineken lata 350ml'), ('skol lata 350ml'), ('amstel lata 350ml'), ('petra lata 350ml'),
  ('original 300ml retornavel'))
UPDATE products p SET active = (p.name_key IN (SELECT name_key FROM keep))
WHERE p.import_source = 'bebidas';
-- Insumo que só servia a bebidas desativadas sai do estoque também.
UPDATE supplies s SET active = EXISTS (
  SELECT 1 FROM product_components pc JOIN products p ON p.id = pc.product_id
  WHERE pc.supply_id = s.id AND p.active)
WHERE s.id IN (SELECT pc.supply_id FROM product_components pc JOIN products p ON p.id = pc.product_id WHERE p.import_source = 'bebidas');
SELECT c.name, p.name, s.active AS insumo_ativo FROM products p
  JOIN product_categories c ON c.id = p.category_id
  JOIN product_components pc ON pc.product_id = p.id JOIN supplies s ON s.id = pc.supply_id
  WHERE p.import_source = 'bebidas' AND p.active ORDER BY c.sort_order, p.name;
SELECT count(*) FILTER (WHERE active) AS ativos, count(*) FILTER (WHERE NOT active) AS inativos FROM products WHERE import_source = 'bebidas';
COMMIT;
