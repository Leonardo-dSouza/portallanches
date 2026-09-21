# Banco de dados — PortalLanches (Sprint 1)

Modelo do fechamento de caixa diário. Stack: PostgreSQL + Prisma (NestJS).

## Convenções

- Valores monetários: `Decimal(10,2)` (nunca float).
- Todas as tabelas têm `id`, `created_at` e `updated_at`.
- Datas de negócio (`business_date`) usam o tipo `date`, sem fuso.
- Regras de permissão (quem vê/edita o quê) ficam na aplicação, não no banco.

## Tabelas

### `users`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `name` | text | |
| `username` | text | único |
| `password_hash` | text | |
| `role` | enum `CAIXA` \| `ADMIN` | |
| `active` | boolean | default `true` |

### `payment_methods`

Cadastráveis pelo admin, para incluir novas maquininhas sem deploy.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `name` | text | único. Ex.: "PIX", "Dinheiro", "Maquininha X - Crédito" |
| `active` | boolean | default `true` |
| `sort_order` | int | ordem de exibição |

### `delivery_zones`

Taxa de entrega padrão por bairro. Ex.: Monterrey = 3,00.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `neighborhood` | text | nome exibido |
| `neighborhood_key` | text | único; minúsculas e sem acento, gerado pela aplicação |
| `fee` | decimal | taxa padrão |
| `active` | boolean | default `true` |

### `motoboy_rate_settings`

Valor da diária do motoboy, editável. Cada mudança é uma nova linha (histórico).
Só existem dois grupos (terça a quinta e sexta a domingo); a segunda, quando a
lanchonete decidir abrir, usa o grupo de sexta a domingo.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `day_group` | enum `TUE_THU` \| `FRI_SUN` | |
| `amount` | decimal | |
| `effective_from` | date | vale a partir desta data |
| `created_by_id` | FK `users` | |

Valor vigente = linha mais recente do grupo com `effective_from <= business_date`.

### `daily_closings`

Um fechamento por dia de operação.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `business_date` | date | único; qualquer dia da semana (a segunda não é bloqueada) |
| `status` | enum `OPEN` \| `CLOSED` | |
| `motoboy_daily_rate` | decimal | valor da diária copiado na criação, preserva o histórico |
| `closed_by_id` | FK `users` | nulo enquanto `OPEN` |
| `closed_at` | timestamptz | |
| `reopened_by_id` | FK `users` | só admin reabre |
| `reopened_at` | timestamptz | |
| `notes` | text | opcional |

### `orders`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `closing_id` | FK `daily_closings` | |
| `amount` | decimal | valor do pedido |
| `type` | enum `DELIVERY` \| `COUNTER` | entrega ou balcão |
| `payment_method_id` | FK `payment_methods` | uma forma de pagamento por pedido |
| `delivery_zone_id` | FK `delivery_zones` | nulo se balcão |
| `delivery_fee` | decimal | cópia da taxa do bairro, pode ser sobrescrita; 0 se balcão |
| `created_by_id` | FK `users` | |

Constraint: se `type = COUNTER`, então `delivery_zone_id` é nulo e `delivery_fee = 0`.

A taxa é copiada da zona no lançamento. Editar `delivery_zones.fee` depois não altera
pedidos antigos, e ainda é possível ajustar uma entrega pontual.

### `expenses`

Gastos e compras do dia (lançamento manual no Sprint 1).

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `closing_id` | FK `daily_closings` | |
| `description` | text | |
| `amount` | decimal | |
| `created_by_id` | FK `users` | |

## Regras de negócio que afetam o banco

- O dia de negócio vira à meia-noite no fuso `BUSINESS_TIMEZONE` (padrão `America/Sao_Paulo`),
  nunca no fuso da máquina do servidor (em contêiner seria UTC e viraria 3h antes).
- Caixa acessa apenas o `daily_closing` com `business_date` de hoje.
- Fechamento `CLOSED` só é editado ou reaberto por admin; a reabertura registra
  `reopened_by_id` e `reopened_at`.
- Preenchimento automático da taxa: ao escolher o bairro no pedido de entrega, a
  aplicação carrega `delivery_zones.fee` em `orders.delivery_fee`.

## Consultas do relatório

- Total por forma de pagamento: `SUM(orders.amount) GROUP BY payment_method_id`.
- Custo do motoboy: `daily_closings.motoboy_daily_rate + SUM(orders.delivery_fee)`.
- Total de gastos: `SUM(expenses.amount)`.

## Preparação para as próximas sprints

- Sprint 2: `orders.customer_id` (nullable) e endereço do cliente apontando para
  `delivery_zone_id`; tabelas de itens, insumos e estoque.
- Sprint 3: itens de pedido e composição de produtos.
