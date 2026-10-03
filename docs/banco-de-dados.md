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
| `customer_id` | FK `customers` | obrigatório na aplicação só para entrega (Entregável 2); nulo em balcão e pedidos antigos |
| `customer_name`, `customer_phone`, `customer_street` | text | cópia do cliente no lançamento |
| `created_by_id` | FK `users` | |

Constraint: se `type = COUNTER`, então `delivery_zone_id` é nulo e `delivery_fee = 0`.

A taxa é copiada da zona no lançamento. Editar `delivery_zones.fee` depois não altera
pedidos antigos, e ainda é possível ajustar uma entrega pontual.

### `customers` (Entregável 2)

Clientes de entrega. O caixa busca pelo telefone; um telefone = um cadastro e uma rua.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `name` | text | |
| `phone` | text | só dígitos; único; nulo quando o pedido não trouxe telefone |
| `street` | text | rua atual, sem número (rua nova substitui); permite ver pedidos por bairro e por rua |
| `delivery_zone_id` | FK `delivery_zones` | bairro do endereço; define a taxa padrão da entrega |

O pedido copia nome, telefone e rua: mudar o cadastro não altera pedidos antigos.

### `supplies` (Entregável 2)

Insumos do estoque. Nada é apagado: sai de uso com `active = false`.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `name` | text | |
| `name_key` | text | único; minúsculas e sem acento |
| `count_unit` | text | unidade em que o insumo é contado (texto livre: un, kg, bandeja...) |
| `min_stock` | decimal(10,3) | abaixo disso é crítico; nulo = sem alerta |
| `unit_cost` | decimal(10,4) | custo em R$ por unidade de contagem (base do CMV); nulo = sem custo |
| `deduct_on_sale` | boolean | padrão true; falso = a venda não desconta do estoque (tomate, queijo peça) |
| `section_id` | FK `supply_sections` | lugar do insumo (Geladeira, Armário...); nulo = "Sem seção" |
| `active` | boolean | default `true` |

O insumo não tem preço de venda próprio: quando existe um produto ativo do Cardápio com só este insumo
e quantidade 1 (bebidas, adicionais de 1 un), a tela de insumos mostra e edita o preço **desse produto**.

### `supply_sections` (sessão 8)

Seções do estoque na ordem da prateleira, para filtrar e agrupar insumos, entrada, contagem e lista de
compras. As 9 seções (Geladeira, Alimentos, Refrigerantes, Cervejas, Armário, Açaí, Embalagens,
Papelaria e sacolas, Limpeza) nascem na migration `20261001120000_supply_sections`.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `name` / `name_key` | text | `name_key` único (minúsculas, sem acento) |
| `sort_order` | int | ordem de exibição |
| `active` | boolean | default `true` |

### `supply_packages` (Entregável 2)

Embalagens de compra com conversão fixa para a unidade de contagem (caixa = 36 un).
A conversão acontece na entrada do estoque; lotes guardam a quantidade já convertida.

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `supply_id` | FK `supplies` | apagada junto com o insumo (cascade) |
| `name` | text | único por insumo |
| `quantity` | decimal(10,3) | unidades de contagem por embalagem |

### `stock_lots`, `stock_movements`, `stock_counts` (Entregável 2)

- `stock_lots`: um por entrada (`quantity` entrada, `remaining` saldo atual, `expires_on` opcional,
  `created_by_id`). Sobra achada na contagem vira lote sem validade. Saldo do insumo = soma de `remaining`.
  `unit_cost` (4 casas) = custo pago por unidade de contagem nesta entrada; quando informado, vira também o
  `supplies.unit_cost` (último custo pago). `reversed_at` = entrada desfeita (saldo zerado).
- `stock_movements`: todo ajuste de lote com sinal (`kind` = `ENTRY`, `COUNT` ou `REVERSAL`; no
  Entregável 3 entra a baixa por venda). `REVERSAL` só vale para entrada intacta (nenhum outro movimento e
  `remaining = quantity`); fora isso, corrige-se pela contagem. É o histórico que permite passar bebidas para "subtração" sem refazer o modelo.
- `stock_counts`: resultado por insumo em cada contagem (`status` `COUNTED` com `quantity`, `NOT_COUNTED`
  ou `NEEDS_PURCHASE`). "Precisa comprar" vale até a próxima entrada do insumo.

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
- Caixa acessa o `daily_closing` de hoje e dos 7 dias anteriores (o admin, qualquer data).
- O `daily_closing` só é gravado no primeiro lançamento (ou ao fechar o dia): consultar um dia
  vazio não cria linha, para não somar a diária do motoboy em dias sem movimento.
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

### `product_categories`, `products`, `product_components` (Entregável 3, adiantado)

Cardápio vindo da planilha de custos (`docs/plano-importacao-cardapio.md`). Ainda não ligado ao pedido.

- `product_categories`: `name`, `name_key` único, `sort_order`, `active`. A migration cria Tradicional (1),
  Artesanal (2) e Adicionais (3); não há tela para criar categorias.
- `products`: `category_id`, `name`, `name_key` (único **por categoria**: "X Salada" pode ser tradicional e
  artesanal), `description` opcional, `menu_number` (número do cardápio impresso, não único: tradicional e artesanal de mesmo nome dividem), `sale_price` decimal(10,2) (nulo = sem preço), `active`.
- `product_components`: `product_id` (cascade), `supply_id`, `quantity` decimal(10,3) na unidade de contagem
  do insumo; um insumo por produto. O CMV não é gravado: é calculado na leitura com o `unit_cost` atual dos insumos.
