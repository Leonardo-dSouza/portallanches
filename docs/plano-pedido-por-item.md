# Plano: pedido por item (Entregável 3)

Status: **implementado na sessão 10 (2026-10-02)**, menos a baixa no estoque (pergunta 4, ainda aberta). Bebidas e açaí cadastrados.
Contexto: o cardápio (lanches com número, preço, composição e CMV) já existe e foi importado da
planilha de custos (`docs/plano-importacao-cardapio.md`). Hoje o caixa lança só o **valor total** do
pedido, em lote, no fim do expediente.

## Perguntas

1. **Velocidade de lançamento.** Uma noite de 40 pedidos vira 100+ linhas de item. O lançamento continua
   em lote (a partir das comandas de papel) ou passa a ser na hora do pedido? Se for em lote, a proposta é
   digitar pelo **número do cardápio** (`9` = X Salada, `9a` = X Salada artesanal) em vez de escolher numa lista.
2. **Itens fora do cadastro.** Bebidas, porções e açaí não estão cadastrados. Como o caixa lança um
   refrigerante: (a) cadastrar esses produtos antes, ou (b) item avulso com descrição e valor digitados,
   sem baixa no estoque? E o pedido pode continuar sendo "só o valor", como os importados?
3. **Preço e desconto.** O total passa a ser a soma dos itens pelo preço do cadastro. O caixa pode mudar o
   preço de um item ou o total (desconto, cortesia, arredondamento)? Se sim, guardar o valor original e o cobrado.
4. **Baixa no estoque: quando?** (a) a cada pedido salvo, e editar/apagar devolve o estoque; ou (b) uma vez
   ao **fechar o dia** (reabrir desfaz), mais simples e sem conflito com a contagem por sobrescrita do mesmo dia.
5. **Registro da época.** A reimportação da planilha muda preço e composição. O pedido deve guardar o preço
   cobrado **e o CMV da época** de cada item? Com o CMV guardado, o lucro de dias antigos não muda quando a
   planilha muda; sem ele, seria recalculado com os custos de hoje.

## Respostas (2026-09-30)
- **2 — Itens fora do cadastro:** (a) **cadastrar as bebidas** como produtos, e isso é o próximo passo (antes do pedido por item).
  O usuário vai mandar uma planilha (xlsx/xlsm) de bebidas para importar.
  Porções e açaí não foram citados.
- **3 — Preço e desconto:** **não**. O caixa não muda preço de item nem o total; o total é a soma pelo preço do cadastro.
- **4 — Baixa no estoque:** **depende do item**. Alguns itens baixam sozinhos; outros precisam de **revisão manual** de uma pessoa
  antes de baixar. Falta decidir o momento (a cada pedido ou ao fechar o dia) e como a revisão aparece.
- **1 — Lançamento:** continua **em lote no fim da noite** (a partir das comandas). Passar a lançar na hora fica para depois,
  para não forçar a mudança na produção e correr atrás de bugs no meio do expediente.
- **5 — Registro da época:** **sim**, o pedido guarda o preço cobrado e o **CMV da época** de cada item. O cliente quer mudar a planilha
  e ver o reflexo no sistema (primeiro pela reimportação); o lucro de dias antigos não pode mudar com isso.

## Respostas da sessão 10 (2026-10-02) e o que foi feito
- **Lançamento:** continua em lote no fim da noite, copiando as comandas, num PC com teclado numérico.
- **Entrada:** número + busca num campo só. **Artesanal = número com ponto ou vírgula** (`9.`), porque
  tradicional e artesanal repetem os números 8 a 27; um número que só existe numa categoria vale com ou sem ponto.
  Bebidas e adicionais (sem número) entram **pela busca por nome**.
- **Pagamento:** um por pedido (dividir entre formas é raro e ficou de fora).
- **Valor do pedido = soma dos itens + taxa de entrega** (é o que o cliente pagou e bate com o caixa).
  O servidor calcula pelo preço do cadastro; o corpo do pedido não aceita `amount`.
- **Preço e CMV da época** em `order_items`; na edição, a linha que já estava mantém os dela.
- **Açaí:** cadastrado por migration com os valores do usuário (Açaí 300/500/700 ml e 15 adicionais do açaí),
  sem composição (CMV incompleto até alguém cadastrar os insumos). Porções não foram citadas.

### Teclas da comanda
| Tecla | O que faz |
|---|---|
| `9` + Enter | X Salada (tradicional) |
| `9.` ou `9,` + Enter | o artesanal do mesmo número |
| `2*9` + Enter | dois do 9 (o `*` do bloco numérico) |
| `coca` + ↑↓ + Enter | busca por nome |
| `+` / `-` (campo vazio) | mais um / menos um no último item |
| Enter (campo vazio) | vai para o pagamento; lá, `1` a `4` escolhem e Enter salva |
| F2 | alterna Balcão/Entrega (na entrega, o foco vai ao Telefone; Enter passa de campo) |
| Ctrl+Enter | salva de qualquer campo |

Medido no dev: um balcão com 5 linhas (um item com quantidade 3) e pagamento = 30 teclas.

## Já decidido antes (contexto)
- Adicionais são produtos soltos da categoria "Adicionais" (preso ao lanche fica para depois; aceito na 4ª rodada da planilha).
- Baixa automática é opcional por insumo (`deduct_on_sale`); tomate, alface, cebola e queijo peça não baixam.
- Ideia do Entregável 2: ao lançar os pedidos da noite, sugerir "retirar 2 refrigerantes vendidos hoje?" (bebidas por subtração).
- **Rendimento (anotado em 2026-10-02, não implementado):** o peito de frango é comprado, limpo e cortado em filé, e perde
  ~20% do peso (1,5 kg comprado vira 1,2 kg de filé). A ideia do usuário: a entrada guarda 1,5 kg (o que foi pago) e a baixa
  desconta sobre 1,2 kg (o que rende). Ver outros insumos com a mesma perda (limpeza, corte, descongelamento) quando chegar a
  hora de detalhar a baixa (pergunta 4).
