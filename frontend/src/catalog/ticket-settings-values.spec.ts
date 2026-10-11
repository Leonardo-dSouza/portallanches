import { parseTicketForm } from './ticket-settings-values';

describe('parseTicketForm', () => {
  it('apara a marca e as abreviações; linha toda vazia é ignorada', () => {
    expect(
      parseTicketForm(' Art ', [
        { from: ' Leite condensado ', to: ' LC ' },
        { from: '', to: '  ' },
        { from: 'X', to: '' },
      ]),
    ).toEqual({
      ok: true,
      value: {
        artisanalMark: 'Art',
        ticketAbbreviations: [
          { from: 'Leite condensado', to: 'LC' },
          { from: 'X', to: '' },
        ],
      },
    });
  });

  it('recusa marca vazia ou com mais de 12 caracteres, citando o valor', () => {
    expect(parseTicketForm('  ', [])).toEqual({
      ok: false,
      error: expect.stringContaining('esperado texto de 1 a 12 caracteres'),
    });
    expect(parseTicketForm('Artesanal da casa', [])).toEqual({
      ok: false,
      error: expect.stringContaining('"Artesanal da casa"'),
    });
  });

  it('recusa abreviação sem o texto que ela troca', () => {
    expect(parseTicketForm('Art', [{ from: ' ', to: 'LC' }])).toEqual({
      ok: false,
      error: expect.stringMatching(/Abreviação 1.*"LC".*1 a 40/),
    });
  });

  it('recusa texto ou abreviação longos demais', () => {
    expect(
      parseTicketForm('Art', [{ from: 'L'.repeat(41), to: 'L' }]),
    ).toMatchObject({ ok: false });
    expect(
      parseTicketForm('Art', [{ from: 'Leite', to: 'L'.repeat(21) }]),
    ).toEqual({
      ok: false,
      error: expect.stringMatching(/Abreviação 1.*0 a 20/),
    });
  });

  it('recusa o mesmo texto duas vezes, sem ligar para maiúscula', () => {
    expect(
      parseTicketForm('Art', [
        { from: 'Leite', to: 'L' },
        { from: 'LEITE', to: 'Lt' },
      ]),
    ).toEqual({
      ok: false,
      error: expect.stringMatching(/"LEITE" aparece mais de uma vez/),
    });
  });
});
