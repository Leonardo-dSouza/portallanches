/**
 * Anotação de estoque do usuário (sessão 8, 2026-10-01): o que a lanchonete já tem, por
 * seção. Não é planilha de importação: o seed só cria o que falta. Nomes com erro de
 * digitação foram corrigidos (Mostartda, Oléo, Nafitalina...). `aliases` = nome do insumo
 * que já existe no banco (planilha de custos ou de bebidas) e é o mesmo item.
 */
export interface SupplySeedEntry {
  name: string;
  aliases?: readonly string[];
}

export interface SupplySeedSection {
  /** Nome da seção criada na migration `20261001120000_supply_sections`. */
  section: string;
  supplies: readonly SupplySeedEntry[];
}

const names = (...list: string[]): SupplySeedEntry[] =>
  list.map((name) => ({ name }));

export const SUPPLY_SEED: readonly SupplySeedSection[] = [
  {
    section: 'Geladeira',
    supplies: [
      ...names('Alface', 'Tomate'),
      { name: 'Hambúrguer', aliases: ['Hambúrguer 56g'] },
      // Sessão 9: peça e bandeja são o mesmo queijo; filé e filé fatiado, o mesmo frango.
      { name: 'Queijo (peça)', aliases: ['Queijo peça'] },
      { name: 'Contra filé' },
      ...names('Filé de frango', 'Calabresa', 'Bacon', 'Ovo'),
      ...names('Presunto', 'Salsicha'),
      { name: 'Cheddar', aliases: ['Cheddar cremoso'] },
      ...names('Cheddar fatia', 'Catupiry', 'Limão'),
    ],
  },
  {
    section: 'Alimentos',
    supplies: [
      { name: 'Maionese bisnaga', aliases: ['Maionese'] },
      { name: 'Maionese artesanal', aliases: ['Maionese grill'] },
      { name: 'Ketchup galão', aliases: ['Ketchup'] },
      { name: 'Mostarda galão', aliases: ['Mostarda'] },
      ...names('Cebola', 'Cebola roxa', 'Vinagre', 'Vinagrete'),
      {
        name: 'Artesanal frango',
        aliases: ['Hambúrguer artesanal frango 150g'],
      },
      {
        name: 'Artesanal linguiça',
        aliases: ['Hambúrguer artesanal toscana 150g'],
      },
      {
        name: 'Artesanal carne',
        aliases: ['Hambúrguer artesanal carne 150g'],
      },
      // Sessão 9: Azeitona, Milho e Pão australiano saíram (ocultos, fora de uso).
      ...names('Cebolinha', 'Batata palha'),
      { name: 'Pão Maxx', aliases: ['Pão brioche max'] },
      { name: 'Pão com gergelim', aliases: ['Pão brioche com gergelim'] },
      // Pães diferentes na contagem e na compra, com o mesmo custo (célula E4 da planilha).
      ...names('Pão de hambúrguer', 'Pão de hot dog'),
    ],
  },
  {
    section: 'Refrigerantes',
    supplies: [
      { name: 'Coca Cola 2,5L', aliases: ['Coca Cola 2,5l'] },
      { name: 'Coca Cola 2L' },
      { name: 'Fanta Laranja 2L', aliases: ['Fanta 2l'] },
      { name: 'It Guaraná 2L' },
      { name: 'It Limão 2L' },
      { name: 'It Laranja 2L' },
      { name: 'Coca Cola 600ml' },
      { name: 'Guaranita 600ml' },
      { name: 'Fanta Laranja 600ml', aliases: ['Fanta 600ml'] },
      { name: 'Coca Cola 350ml', aliases: ['Coca Cola Lt 350ml'] },
      {
        name: 'Guaraná Antarctica 350ml',
        aliases: ['Guar Antartica Lt 350ml'],
      },
      { name: 'Fanta Laranja 350ml', aliases: ['Fanta Lt 350ml'] },
    ],
  },
  {
    section: 'Cervejas',
    supplies: [
      { name: 'Skol 350ml', aliases: ['Skol Lata 350ml'] },
      { name: 'Original 300ml', aliases: ['Original 300ml Retornavel'] },
      { name: 'Itaipava 350ml', aliases: ['Itaipava Lata 350ml'] },
      { name: 'Itaipava 600ml', aliases: ['Itaipava 600ml Retornavel'] },
      { name: 'Amstel 350ml', aliases: ['Amstel Lata 350ml'] },
      { name: 'Heineken 350ml', aliases: ['Heineken Lata 350ml'] },
      { name: 'Império 350ml' },
      { name: 'Petra 350ml', aliases: ['Petra Lata 350ml'] },
    ],
  },
  {
    section: 'Armário',
    supplies: names(
      'Creme de leite',
      'Óleo',
      'Azeite',
      'Açúcar',
      'Sal',
      'Creme de cebola',
      'Tempero',
      'Maionese sachê',
      'Ketchup sachê',
      'Alho',
    ),
  },
  {
    section: 'Açaí',
    supplies: names(
      'Chocoball',
      'Paçoca',
      'Leite em pó',
      'Confete',
      'Granulado',
      'Ovomaltine',
      'Granola',
      'Bis',
      'Oreo',
      'Kiwi',
      'Morango',
      'Banana',
      'Leite condensado',
      'Suco de morango',
      'Suco de maracujá',
    ),
  },
  {
    section: 'Embalagens',
    supplies: [
      ...names('Copo 700ml', 'Copo 500ml', 'Copo 300ml'),
      ...names('Tampa 700ml', 'Tampa 500ml', 'Tampa 300ml'),
      { name: 'Hamburgueira hot' },
      { name: 'Hamburgueira', aliases: ['Hamburgueira lanche'] },
      { name: 'Potinho de molho', aliases: ['Pote de molho 30g'] },
      { name: 'Saquinho de molho' },
      ...names('Potinho caldinho (queijo)', 'Tampinha caldinho'),
      { name: 'Colher plástico' },
      { name: 'Papel acoplado' },
      { name: 'Caixinha para artesanal', aliases: ['Hamburgueira gourmet'] },
    ],
  },
  {
    section: 'Papelaria e sacolas',
    supplies: [
      { name: 'Papel kraft (pequeno)', aliases: ['Saco kraft'] },
      { name: 'Papel manteiga' },
      ...names('Papel TV', 'Comanda', 'Papel sulfite', 'Grampo', 'Durex'),
      ...names('Sacola lanche', 'Sacola açaí', 'Sacola lanche maior'),
    ],
  },
  {
    section: 'Limpeza',
    supplies: names(
      'Detergente',
      'Saco de lixo',
      'Bucha/esponja',
      'Veja',
      'Álcool',
      'Taí',
      'Naftalina',
      'Sabão para mão',
      'Papel toalha',
      'Papel higiênico',
      'Luva',
      'Touca',
      'Desinfetante',
    ),
  },
];
