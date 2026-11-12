import {
  parseDrawerAmount,
  drawerFormOf,
  parseDrawerSettings,
} from './drawer-settings-values';

describe('drawer-settings-values', () => {
  it('converte valores válidos para o formato da API', () => {
    const parsed = parseDrawerSettings({
      openingDefault: '35,00',
      cashTolerance: '2,50',
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        drawerOpeningDefault: '35.00',
        drawerCashTolerance: '2.50',
      },
    });
  });

  it('aceita valor zero para abertura e tolerância', () => {
    const parsed = parseDrawerSettings({
      openingDefault: '0',
      cashTolerance: '0,00',
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        drawerOpeningDefault: '0.00',
        drawerCashTolerance: '0.00',
      },
    });
  });

  it('recusa troco inicial padrão vazio ou inválido', () => {
    expect(
      parseDrawerSettings({ openingDefault: '', cashTolerance: '2' }),
    ).toEqual({
      ok: false,
      error:
        'Informe o troco inicial padrão: esperado valor de 0 a 9.999,99 (ex.: 30,00)',
    });
    expect(
      parseDrawerSettings({ openingDefault: 'abc', cashTolerance: '2' }),
    ).toEqual({
      ok: false,
      error:
        'Valor inválido para o troco inicial padrão "abc": esperado número de 0 a 9.999,99',
    });
  });

  it('recusa tolerância vazia ou inválida', () => {
    expect(
      parseDrawerSettings({ openingDefault: '30', cashTolerance: '   ' }),
    ).toEqual({
      ok: false,
      error:
        'Informe a diferença aceita no dinheiro: esperado valor de 0 a 9.999,99 (ex.: 30,00)',
    });
    expect(
      parseDrawerSettings({ openingDefault: '30', cashTolerance: '-1' }),
    ).toEqual({
      ok: false,
      error:
        'Valor inválido para a diferença aceita no dinheiro "-1": esperado número de 0 a 9.999,99',
    });
  });

  it('recusa valores acima do limite de 9999,99', () => {
    expect(
      parseDrawerSettings({ openingDefault: '10000', cashTolerance: '2' }),
    ).toEqual({
      ok: false,
      error:
        'Valor muito alto para o troco inicial padrão "10000": o valor não pode passar de R$ 9.999,99',
    });
    expect(
      parseDrawerSettings({ openingDefault: '30', cashTolerance: '10000' }),
    ).toEqual({
      ok: false,
      error:
        'Valor muito alto para a diferença aceita no dinheiro "10000": o valor não pode passar de R$ 9.999,99',
    });
  });

  it('drawerFormOf converte do padrão da API para o formulário', () => {
    expect(
      drawerFormOf({
        drawerOpeningDefault: '30.00',
        drawerCashTolerance: '2.00',
      }),
    ).toEqual({
      openingDefault: '30,00',
      cashTolerance: '2,00',
    });
  });
});

describe('parseDrawerAmount', () => {
  it('converte inteiros e decimais com vírgula ou ponto para o padrão da API', () => {
    expect(parseDrawerAmount('30', 'o troco inicial')).toEqual({
      ok: true,
      value: '30.00',
    });
    expect(parseDrawerAmount('40,50', 'o troco inicial')).toEqual({
      ok: true,
      value: '40.50',
    });
    expect(parseDrawerAmount('0', 'o troco inicial')).toEqual({
      ok: true,
      value: '0.00',
    });
    expect(parseDrawerAmount('9999,99', 'o troco inicial')).toEqual({
      ok: true,
      value: '9999.99',
    });
  });

  it('põe o rótulo na mensagem do vazio', () => {
    expect(parseDrawerAmount('   ', 'o troco inicial')).toEqual({
      ok: false,
      error:
        'Informe o troco inicial: esperado valor de 0 a 9.999,99 (ex.: 30,00)',
    });
  });
});
