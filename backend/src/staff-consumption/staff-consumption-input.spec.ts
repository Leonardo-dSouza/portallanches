import { parseStaffConsumptionInput } from './staff-consumption-input.js';

const MISTO = { productId: 9, quantity: 1 };

describe('parseStaffConsumptionInput', () => {
  it('apara o nome de quem consumiu e lê os itens como os do pedido', () => {
    const input = parseStaffConsumptionInput({
      consumerName: '  Bianca ',
      items: [{ ...MISTO, addons: [{ productId: 33, quantity: 1 }] }],
    });

    expect(input).toEqual({
      consumerName: 'Bianca',
      items: [
        {
          productId: 9,
          quantity: 1,
          note: null,
          addons: [{ productId: 33, quantity: 1 }],
        },
      ],
    });
  });

  it('recusa sem o nome de quem consumiu, mostrando o que veio', () => {
    expect(() =>
      parseStaffConsumptionInput({ consumerName: '  ', items: [MISTO] }),
    ).toThrow(/"consumerName" inválido: recebido "  "/);
  });

  it('recusa nome com mais de 40 caracteres', () => {
    const consumerName = 'x'.repeat(41);
    expect(() =>
      parseStaffConsumptionInput({ consumerName, items: [MISTO] }),
    ).toThrow(/texto de 1 a 40 caracteres/);
  });

  it('recusa sem itens', () => {
    expect(() =>
      parseStaffConsumptionInput({ consumerName: 'Bianca', items: [] }),
    ).toThrow(/"items" inválido/);
  });

  it('recusa corpo que não é objeto', () => {
    expect(() => parseStaffConsumptionInput([])).toThrow(
      /esperado objeto JSON de consumo interno/,
    );
  });
});
