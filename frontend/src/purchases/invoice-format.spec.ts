import {
  formatCnpj,
  formatCnpjRoot,
  formatDayMonth,
  formatIssuedAt,
  itemCountLabel,
  sefazInvoiceUrl,
  formatBaseDiff,
  baseDiffTone,
} from './invoice-format';

describe('formatDayMonth', () => {
  it('mostra dia e mês no horário de SP', () => {
    expect(formatDayMonth('2026-10-30T14:20:00.000Z')).toBe('30/10');
  });
});

describe('formatIssuedAt', () => {
  it('mostra a emissão no horário de SP, mesmo com o instante em UTC', () => {
    expect(formatIssuedAt('2026-10-18T20:14:11.000Z')).toBe('18/10/2026 17:14');
  });

  it('a virada do dia em UTC continua no dia de SP', () => {
    expect(formatIssuedAt('2026-10-19T02:30:00.000Z')).toBe('18/10/2026 23:30');
  });
});

describe('formatCnpj', () => {
  it('põe pontos, barra e traço', () => {
    expect(formatCnpj('06057223058250')).toBe('06.057.223/0582-50');
  });

  it('devolve como veio o que não tem 14 números', () => {
    expect(formatCnpj('123')).toBe('123');
  });
});

describe('sefazInvoiceUrl', () => {
  it('monta a consulta pública pela chave, no host da SEFAZ-SP', () => {
    expect(
      sefazInvoiceUrl('35261011222333000181650010000012341123456780'),
    ).toBe(
      'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35261011222333000181650010000012341123456780|3|1',
    );
  });
});

describe('itemCountLabel', () => {
  it('singular só para um item', () => {
    expect(itemCountLabel(1)).toBe('1 item');
    expect(itemCountLabel(20)).toBe('20 itens');
  });
});

describe('formatCnpjRoot', () => {
  it('a raiz (a empresa, igual em todas as filiais) com os pontos', () => {
    expect(formatCnpjRoot('06057223')).toBe('06.057.223');
  });
});

describe('formatBaseDiff e baseDiffTone', () => {
  it('acima da base com sinal e vermelho; abaixo verde; sem base neutro', () => {
    expect(formatBaseDiff('2.2')).toBe('+2,2%');
    expect(formatBaseDiff('-17.6')).toBe('-17,6%');
    expect(formatBaseDiff('0.0')).toBe('0,0%');
    expect(formatBaseDiff(null)).toBe('sem base');
    expect(baseDiffTone({ diffPercent: '2.2', above: true })).toBe('danger');
    expect(baseDiffTone({ diffPercent: '-17.6', above: false })).toBe(
      'success',
    );
    expect(baseDiffTone({ diffPercent: null, above: false })).toBe('muted');
  });
});
