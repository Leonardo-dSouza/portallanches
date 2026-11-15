-- Troca os dados pessoais do banco do DEV por falsos (S-01 do mapa de segurança, 2026-11-15).
-- Roda pelo deploy/anonymize-dev-db.sh, que passa :admin_hash e :caixa_hash. Nunca na produção.
-- Os falsos são estáveis pelo id: a mesma rua vira a mesma "Rua Teste N", o mesmo funcionário vira
-- o mesmo "Equipe N", então busca, agrupamento por rua e relatórios continuam fazendo sentido.
\set ON_ERROR_STOP on
begin;

-- Ruas de clientes e de pedidos avulsos, com um nome falso por rua real.
create temp table street_alias on commit drop as
select street, 'Rua Teste ' || dense_rank() over (order by street) as alias
from (
  select street from customers where street is not null
  union
  select customer_street from orders where customer_street is not null
) as streets;

-- Telefone em dois passos: o falso de um cliente não pode bater no real de outro (telefone é único).
update customers set phone = 'tmp' || id where phone is not null;
update customers c set
  name = 'Cliente ' || c.id,
  name_key = 'cliente ' || c.id,
  phone = case when c.phone is null then null else '119' || lpad(c.id::text, 8, '0') end,
  street = s.alias,
  number = case when c.number is null then null else ((c.id * 37) % 900 + 10)::text end,
  reference = case when c.reference is null then null else 'Referência ' || c.id end
from customers c2
left join street_alias s on s.street = c2.street
where c2.id = c.id;

-- O retrato do cliente no pedido segue o cliente falso; o avulso ganha um falso próprio.
update orders o set
  customer_name = case when o.customer_name is null then null else c.name end,
  customer_phone = case when o.customer_phone is null then null else c.phone end,
  customer_street = case when o.customer_street is null then null else c.street end,
  customer_number = case when o.customer_number is null then null else c.number end,
  customer_reference = case when o.customer_reference is null then null else c.reference end
from customers c
where o.customer_id = c.id;

update orders o set
  customer_name = case when o.customer_name is null then null else 'Avulso ' || o.id end,
  customer_phone = case when o.customer_phone is null then null else '118' || lpad(o.id::text, 8, '0') end,
  customer_street = s.alias,
  customer_number = case when o.customer_number is null then null else ((o.id * 37) % 900 + 10)::text end,
  customer_reference = case when o.customer_reference is null then null else 'Referência avulsa ' || o.id end
from orders o2
left join street_alias s on s.street = o2.customer_street
where o2.id = o.id and o.customer_id is null;

-- Nomes da equipe no consumo interno.
with staff as (
  select consumer_key, dense_rank() over (order by consumer_key) as n
  from (select distinct consumer_key from staff_consumptions) as keys
)
update staff_consumptions sc set
  consumer_name = 'Equipe ' || staff.n,
  consumer_key = 'equipe ' || staff.n
from staff
where sc.consumer_key = staff.consumer_key;

-- Textos livres que podem ter nome de cliente, freelancer ou funcionário.
update expenses set description = 'Observação ' || id where description is not null;
update expense_events set details = (
  select jsonb_object_agg(
    part.key,
    case when jsonb_typeof(part.value) = 'object' and part.value ? 'description'
      then jsonb_set(part.value, '{description}', to_jsonb('Observação ' || expense_events.expense_id))
      else part.value end)
  from jsonb_each(details) as part)
where jsonb_typeof(details) = 'object' and details <> '{}'::jsonb;
update orders set cancel_reason = 'Motivo de teste' where cancel_reason is not null;
update fiado_payments set cancel_reason = 'Motivo de teste' where cancel_reason is not null;
update order_events set details = jsonb_set(details, '{reason}', '"Motivo de teste"') where details ? 'reason';
update daily_closings set notes = 'Nota de teste' where notes is not null;

-- Usuários: nome falso e a senha do dev (os hashes da produção não ficam no PC de dev).
update users set
  name = case role when 'ADMIN' then 'Admin ' else 'Caixa ' end || id,
  password_hash = case role when 'ADMIN' then :'admin_hash' else :'caixa_hash' end;

commit;

select
  (select count(*) from customers) as clientes,
  (select count(*) from customers where phone is not null and phone !~ '^119\d{8}$') as telefones_reais,
  (select count(*) from orders where customer_phone is not null and customer_phone !~ '^11[89]\d{8}$') as telefones_reais_em_pedidos,
  (select count(*) from users) as usuarios;
