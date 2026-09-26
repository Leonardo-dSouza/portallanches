# Plano: pedido por item (Entregável 3) — perguntas em aberto

Status: **aguardando respostas do usuário** (grill-me feito em 2026-09-26, sessão 6). Nada implementado.
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

## Já decidido antes (contexto)
- Adicionais são produtos soltos da categoria "Adicionais" (preso ao lanche fica para depois; aceito na 4ª rodada da planilha).
- Baixa automática é opcional por insumo (`deduct_on_sale`); tomate, alface, cebola e queijo peça não baixam.
- Ideia do Entregável 2: ao lançar os pedidos da noite, sugerir "retirar 2 refrigerantes vendidos hoje?" (bebidas por subtração).
