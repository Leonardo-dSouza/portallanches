# Requisitos do MVP — PortalLanches

## Contexto

O sistema será usado inicialmente por uma única lanchonete (lanches tradicionais, artesanais, açaí, porções e bebidas).
No início, o lançamento dos pedidos acontece ao fim do expediente (pedidos feitos no papel durante o atendimento).

## Perfis de acesso (entregável 1)

- **Caixa**
  - Lança e fecha o caixa do dia vigente e dos 7 dias anteriores (para lançamentos atrasados).
  - Não visualiza dias mais antigos que isso nem o histórico.
  - Não reabre um dia fechado (só o admin).
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

### Decisões (grill-me de 2026-09-23)

Referência de produto: o sistema se inspira no **Consumer** (gestão de restaurantes e pizzarias), adaptado ao negócio.

- **Clientes**
  - Obrigatório só em pedido de **entrega**; balcão segue sem cliente. Pedidos importados ficam sem cliente.
  - O caixa busca pelo **telefone** e o sistema preenche nome, rua e bairro; cliente novo é cadastrado na hora.
  - Guarda-se só a **rua** (sem número): objetivo é ver quais bairros e ruas mais pedem.
  - Telefone é opcional (dá para lançar só com nome e rua). Um telefone tem **uma** rua.
  - Rua nova substitui a do cadastro; o pedido guarda uma cópia do nome e da rua da época.
  - No formulário de entrega, cliente e bairro vêm **antes** de valor e pagamento.
  - O bairro do endereço é o cadastro de bairros com taxa que já existe.
- **Insumos** (neste entregável "item" = só insumo: hambúrguer, refrigerante, queijo...)
  - Cada insumo tem **uma unidade de contagem** e pode ter **embalagens** com conversão fixa (ex.: caixa = 36 un; fardo = 6 un).
  - Transformações (peça de queijo → bandejas) não são registradas: são dois insumos, cada um com sua contagem.
  - Estoque mínimo opcional, na unidade de contagem.
- **Lotes e validade**
  - Cada entrada é um lote com quantidade e validade próprias (validade opcional, ex.: sacolas).
  - Aviso de validade com **7 dias** de antecedência.
  - A compra continua sendo só um gasto; a entrada no estoque é um lançamento separado.
- **Contagem**
  - O estoque só muda por **contagem periódica, por sobrescrita** (ontem 8, hoje informo 6).
  - Futuro (Entregável 3, com pedidos vinculados a itens): insumos como bebidas passam a ser **por subtração**, com sobrescrita opcional. Ao lançar os pedidos da noite, o sistema sugere "retirar 2 refrigerantes vendidos hoje?". O histórico de contagens e entradas deve ser guardado como movimentos para esse passo caber sem refazer o modelo.
  - Informa-se o total do insumo; o sistema desconta dos lotes que vencem primeiro (sem validade por último).
  - Em cada contagem, um insumo pode ficar **"não contado"** (ex.: fatias de presunto) ou **"precisa comprar"** sem número (ex.: calabresa fatiada congelada).
  - Caixa e admin lançam contagens e entradas.
- **Lista de compras**
  - Exporta em **texto** o saldo atual dos insumos escolhidos, para conferir antes de comprar.
- Telas pensadas para desktop (celular fica para depois).

## Requisitos funcionais — Entregável 3

1. Estrutura de itens + composição (ex.: X-salada com seus insumos e quantidades).
2. Pedidos vinculados aos itens.
3. Preparação para horário de atendimento.
4. Melhorias para facilitar anotação dos pedidos.

> Adiantado a partir da planilha de custos: cadastro de lanches com categoria, composição, preço e CMV,
> ainda sem ligar ao pedido do caixa. Decisões e etapas em `docs/plano-importacao-cardapio.md`.

## Requisitos funcionais — Entregável 4 (visão futura)

1. Evolução para PDV em tempo real durante o atendimento.
2. Módulo de cozinha.
3. Protótipos e telas operacionais para fluxo ao vivo.

## Integrações

- WhatsApp para gastos foi levantado como ideia futura (bot em grupo).
- Para o primeiro entregável, permanece manual.
