// Página da consulta da NFC-e (SEFAZ-SP, XSLT 2.05) montada à mão, com a mesma marcação da
// página real: quebras de linha dentro dos spans, `id="linhaTotal"` repetido e "Troco" com NaN.
// Tudo sintético: o repositório é público e a nota real traz o CPF do consumidor.

export interface FixtureItem {
  description: string;
  code: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string;
}

export interface FixturePage {
  issuerName: string;
  cnpj: string;
  items: FixtureItem[];
  itemsTotal: string;
  discount: string | null;
  amountDue: string;
  payments: { label: string; amount: string }[];
  number: string;
  series: string;
  issuedAt: string;
  consumerCpf: string | null;
  status: 'normal' | 'canceled' | 'denied';
}

export const CONSUMER_CPF = '123.456.789-09';

export const SAMPLE_PAGE: FixturePage = {
  issuerName: 'MERCADO EXEMPLO &amp; FILHOS LTDA',
  cnpj: '11.222.333/0001-81',
  items: [
    {
      description: 'BACON EXEMPLO kg',
      code: '1001',
      quantity: '1,234',
      unit: 'KG',
      unitPrice: '39,9',
      total: '49,24',
    },
    {
      description: 'REF COLA 350ML',
      code: '7890000000017',
      quantity: '12',
      unit: 'UN',
      unitPrice: '3,49',
      total: '41,88',
    },
    {
      description: 'CAIXA TERMICA 50L',
      code: '2002',
      quantity: '1',
      unit: 'UN',
      unitPrice: '1.234,5',
      total: '1.234,50',
    },
  ],
  itemsTotal: '1.325,62',
  discount: '5,62',
  amountDue: '1.320,00',
  payments: [
    { label: 'Cartão de Crédito', amount: '1.000,00' },
    { label: 'Dinheiro', amount: '320,00' },
  ],
  number: '1234',
  series: '12',
  issuedAt: '18/10/2026 17:14:11',
  consumerCpf: CONSUMER_CPF,
  status: 'normal',
};

function itemRow(item: FixtureItem, index: number): string {
  return `
      <tr id="Item + ${index + 1}">
        <td valign="top">
          <span class="txtTit">${item.description}</span>
          <span class="RCod">
                    (Código:
                    ${item.code}
                    )
                  </span>
          <br>
          <span class="Rqtd">
            <strong>Qtde.:</strong>${item.quantity}</span>
          <span class="RUN">
            <strong>UN: </strong>${item.unit}</span>
          <span class="RvlUnit">
            <strong>Vl. Unit.:</strong>
                    ${item.unitPrice}</span>
        </td>
        <td align="right" valign="top" class="txtTit noWrap">
                  Vl. Total
                  <br><span class="valor">${item.total}</span></td>
      </tr>`;
}

function totalLine(label: string, value: string): string {
  return `
      <div id="linhaTotal">
        <label>${label}</label>
        <span class="totalNumb">${value}</span>
      </div>`;
}

function paymentLine(label: string, amount: string): string {
  return `
      <div id="linhaTotal">
        <label class="tx">
                      ${label}
                    </label>
        <span class="totalNumb">${amount}</span>
      </div>`;
}

function totals(page: FixturePage): string {
  const discount = page.discount
    ? totalLine('Descontos R$:', page.discount)
    : '';
  return `
    <div id="totalNota" class="txtRight">
      ${totalLine('Qtd. total de itens:', String(page.items.length))}
      ${totalLine('Valor total R$:', page.itemsTotal)}
      ${discount}
      <div id="linhaTotal" class="linhaShade">
        <label>Valor a pagar R$:</label>
        <span class="totalNumb txtMax">${page.amountDue}</span>
      </div>
      <div id="linhaForma">
        <label>Forma de pagamento:</label>
        <span class="totalNumb txtTitR">Valor pago R$:</span>
      </div>
      ${page.payments.map((p) => paymentLine(p.label, p.amount)).join('')}
      <div id="linhaTotal">
        <label class="tx">Troco </label>
        <span class="totalNumb">NaN</span>
      </div>
      <div id="linhaTotal" class="spcTop">
        <label class="txtObs">Informação dos Tributos Totais Incidentes
                  (Lei Federal 12.741/2012) R$</label>
        <span class="totalNumb txtObs">31,77</span>
      </div>
    </div>`;
}

function consumer(cpf: string | null): string {
  const line = cpf
    ? `<li><strong>CPF: </strong>${cpf}</li><li><strong>Nome: </strong></li>`
    : '<li><strong>Consumidor não identificado</strong></li>';
  return `
    <div class="jqm-collapsible v400">
      <h4>Consumidor</h4>
      <ul class="jqm-listview">${line}</ul>
    </div>`;
}

function generalInfo(page: FixturePage): string {
  return `
    <div class="jqm-collapsible v400">
      <h4>Informações gerais da Nota</h4>
      <ul class="jqm-listview">
        <li>
          <strong>EMISSÃO NORMAL</strong>
          <br>
          <br>
          <strong>Número: </strong>${page.number}<strong> Série: </strong>${page.series}<strong> Emissão: </strong>${page.issuedAt}
                - Via Consumidor
                <br><br><strong>Protocolo de Autorização: </strong>135000000000000       ${page.issuedAt}<br><br><strong>
                    Ambiente de Produção -
                  Versão XML:
                  4.00
                  - Versão XSLT: 2.05
                </strong></li>
      </ul>
    </div>`;
}

const STATUS_MARK: Record<FixturePage['status'], string> = {
  normal: '',
  canceled:
    '<input type="hidden" name="hdfNotaCancelada" id="hdfNotaCancelada" value="1" />',
  denied:
    '<input type="hidden" name="hdfNotaDenegada" id="hdfNotaDenegada" value="1" />',
};

// O script da página real cita os ids das marcas mesmo na nota válida: o leitor não pode
// confundir o texto do script com o campo escondido.
const PAGE_SCRIPT = `<script type="text/javascript">
        function ExibirImagemCancelada() { if ($('#hdfNotaCancelada').length) { } }
        function ExibirImagemDenegada() { if ($('#hdfNotaDenegada').length) { } }
    </script>`;

/** Página da nota com os dados de `page`. */
export function nfcePageHtml(page: FixturePage): string {
  return `<!DOCTYPE html><html><head><title>Consulta NFC-e QR Code</title></head><body>
    <form method="post" id="ctl00">${STATUS_MARK[page.status]}
  <div class="jqm-content">
  <div id="conteudo">
    <div id="avisos"></div>
    <div class="txtCenter">
      <div id="u20" class="txtTopo">${page.issuerName}</div>
      <div class="text">
                CNPJ:
                ${page.cnpj}</div>
      <div class="text">RUA DE EXEMPLO
              ,
              100
              ,
              ,
              CENTRO
              ,
              SAO PAULO
              ,
              SP</div>
    </div>
    <table border="0" align="center" id="tabResult" class="filterable">${page.items.map(itemRow).join('')}
    </table>${totals(page)}
  </div>
  <div id="infos" class="txtCenter">${generalInfo(page)}
    <div class="jqm-collapsible v400"><h4>Chave de acesso</h4><ul><li><span class="chave">3526 1011 2223 3300 0181 6500 1000 0012 3411 2345 6780</span></li></ul></div>${consumer(page.consumerCpf)}
  </div>
  </div></form>${PAGE_SCRIPT}</body></html>`;
}

/** Página de erro da consulta (ex.: chave que a SEFAZ não reconhece). */
export function nfceErrorPageHtml(message: string | null): string {
  const script = message
    ? `$('#spnErroProsseguirMaster').html('<ul><li>${message}</li></ul>'); $(function(){openDialog('divErroProsseguirMaster');});`
    : '';
  return `<!DOCTYPE html><html><body><form id="ctl00">
        <div id="divErroProsseguirMaster" title="Erro" style="display: none">
            <strong><span id="spnErroProsseguirMaster" class="corTextoErro"></span></strong>
        </div>
        <h3 style="text-align: left">Consulta Pública por QR Code</h3>
    </form><script type="text/javascript">//<![CDATA[
${script}//]]>
</script></body></html>`;
}
