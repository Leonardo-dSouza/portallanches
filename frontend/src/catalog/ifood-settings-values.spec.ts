import {
  ifoodFormOf,
  parseIfoodPercent,
  parseIfoodSettings,
} from './ifood-settings-values';

describe('ifood-settings-values', () => {
  it('converte valores válidos para o formato da API com ponto', () => {
    const parsed = parseIfoodSettings({
      profitPercent: '10,50',
      commissionPercent: '28',
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        ifoodProfitPercent: '10.5',
        ifoodCommissionPercent: '28',
      },
    });
  });

  it('aceita valor zero para lucro e comissão', () => {
    const parsed = parseIfoodSettings({
      profitPercent: '0',
      commissionPercent: '0,00',
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        ifoodProfitPercent: '0',
        ifoodCommissionPercent: '0',
      },
    });
  });

  it('recusa lucro no iFood vazio ou inválido', () => {
    expect(
      parseIfoodSettings({ profitPercent: '', commissionPercent: '28' }),
    ).toEqual({
      ok: false,
      error:
        'Informe o lucro no iFood: esperado número de 0 a 100 com até 2 casas (ex.: 10)',
    });
    expect(
      parseIfoodSettings({ profitPercent: 'abc', commissionPercent: '28' }),
    ).toEqual({
      ok: false,
      error:
        'Valor inválido para o lucro no iFood "abc": esperado número de 0 a 100 com até 2 casas',
    });
  });

  it('recusa comissão vazia ou inválida', () => {
    expect(
      parseIfoodSettings({ profitPercent: '10', commissionPercent: '   ' }),
    ).toEqual({
      ok: false,
      error:
        'Informe a comissão do iFood: esperado número de 0 a 100 com até 2 casas (ex.: 28)',
    });
    expect(
      parseIfoodSettings({ profitPercent: '10', commissionPercent: '-1' }),
    ).toEqual({
      ok: false,
      error:
        'Valor inválido para a comissão do iFood "-1": esperado número de 0 a 100 com até 2 casas',
    });
  });

  it('recusa valores acima de 100', () => {
    expect(
      parseIfoodSettings({ profitPercent: '101', commissionPercent: '28' }),
    ).toEqual({
      ok: false,
      error:
        'Valor inválido para o lucro no iFood "101": o valor não pode passar de 100%',
    });
    expect(
      parseIfoodSettings({ profitPercent: '10', commissionPercent: '105' }),
    ).toEqual({
      ok: false,
      error:
        'Valor inválido para a comissão do iFood "105": o valor não pode passar de 100%',
    });
  });

  it('ifoodFormOf converte do padrão da API para o formulário com vírgula', () => {
    expect(
      ifoodFormOf({
        ifoodProfitPercent: '10.5',
        ifoodCommissionPercent: '28',
      }),
    ).toEqual({
      profitPercent: '10,5',
      commissionPercent: '28',
    });
  });
});

describe('parseIfoodPercent', () => {
  it('converte inteiros e decimais com vírgula para o formato da API', () => {
    expect(parseIfoodPercent('10', 'o lucro no iFood')).toEqual({
      ok: true,
      value: '10',
    });
    expect(parseIfoodPercent('28,50', 'a comissão do iFood')).toEqual({
      ok: true,
      value: '28.5',
    });
    expect(parseIfoodPercent('100', 'o lucro no iFood')).toEqual({
      ok: true,
      value: '100',
    });
  });

  it('põe o rótulo na mensagem quando vazio', () => {
    expect(parseIfoodPercent('  ', 'o lucro no iFood')).toEqual({
      ok: false,
      error:
        'Informe o lucro no iFood: esperado número de 0 a 100 com até 2 casas (ex.: 10)',
    });
  });
});
