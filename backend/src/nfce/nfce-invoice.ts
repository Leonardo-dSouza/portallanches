/** Linha da nota como a SEFAZ mostra (bacon em 3 linhas = 3 itens). Números em texto, sem float. */
export interface NfceItem {
  position: number;
  /** Código do produto no mercado (ex.: '16556' ou o EAN). */
  code: string;
  description: string;
  /** Quantidade normalizada ('3.107', '12'). */
  quantity: string;
  unit: string;
  /** Preço unitário normalizado ('7.79', '14.9'). */
  unitPrice: string;
  /** Total da linha com 2 casas ('24.20'). */
  total: string;
}

/** O que a página da consulta mostra da nota; a seção Consumidor nunca é lida. */
export interface NfcePage {
  issuerName: string;
  /** CNPJ do emitente só em números (14). */
  issuerCnpj: string;
  number: number;
  series: number;
  issuedAt: Date;
  itemsTotal: string;
  discount: string;
  amountDue: string;
  /** Formas de pagamento juntas ('Cartão de Crédito + Dinheiro'); null quando a nota não diz. */
  paymentLabel: string | null;
  items: NfceItem[];
}

/** Nota lida na SEFAZ-SP, com a chave conferida. */
export interface NfceInvoice extends NfcePage {
  accessKey: string;
}
