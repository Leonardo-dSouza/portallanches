# Requisitos do MVP — PortalLanches

## Contexto

O sistema será usado inicialmente por uma única lanchonete (lanches tradicionais, artesanais, açaí, porções e bebidas).
No início, o lançamento dos pedidos acontece ao fim do expediente (pedidos feitos no papel durante o atendimento).

## Perfis de acesso (entregável 1)

- **Caixa**
  - Fecha apenas o caixa do dia vigente.
  - Não visualiza dias anteriores.
- **Admin**
  - Visualiza histórico.
  - Pode editar registros.

> Observação: autenticação inicialmente sem foco em segurança avançada, por uso interno em servidor próprio.

## Requisitos funcionais — Entregável 1 (MVP inicial)

1. Login por perfil (caixa/admin).
2. Fechamento diário com cadastro manual dos pedidos do dia:
   - valor do pedido;
   - tipo: entrega ou balcão;
   - forma de pagamento.
3. Registro de custos de motoboy:
   - diária com regra de valor por dia da semana (terça a quinta = X; sexta a domingo = Y);
   - valores dinâmicos/editáveis;
   - soma das taxas de entrega dos pedidos.
4. Registro de gastos/compras do dia (manual, nesta primeira entrega).
5. Relatório de fechamento para admin, com totais por forma de pagamento:
   - PIX;
   - dinheiro;
   - maquininha X crédito/débito;
   - maquininha Y crédito/débito (e similares).

## Requisitos funcionais — Entregável 2

1. Cadastro mais detalhado de clientes/pedidos (nome, número, endereço e dados principais).
2. Módulo de itens e insumos (preparação estrutural).
3. MVP desta fase: estoque com:
   - saldo;
   - alerta de baixo estoque;
   - validade.

## Requisitos funcionais — Entregável 3

1. Estrutura de itens + composição (ex.: X-salada com seus insumos e quantidades).
2. Pedidos vinculados aos itens.
3. Preparação para horário de atendimento.
4. Melhorias para facilitar anotação dos pedidos.

## Requisitos funcionais — Entregável 4 (visão futura)

1. Evolução para PDV em tempo real durante o atendimento.
2. Módulo de cozinha.
3. Protótipos e telas operacionais para fluxo ao vivo.

## Integrações

- WhatsApp para gastos foi levantado como ideia futura (bot em grupo).
- Para o primeiro entregável, permanece manual.
