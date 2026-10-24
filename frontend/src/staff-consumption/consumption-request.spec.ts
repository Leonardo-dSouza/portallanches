import type { DraftLine } from '../cash/order-lines';
import { buildConsumptionRequest } from './consumption-request';

const SALADA: DraftLine = {
  id: 1,
  productId: 1,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  unitPrice: '17.80',
  quantity: 1,
  note: '',
  addons: [],
};

describe('buildConsumptionRequest', () => {
  it('nome aparado e os itens no formato do pedido', () => {
    expect(buildConsumptionRequest('  Bianca ', [SALADA])).toEqual({
      ok: true,
      request: {
        consumerName: 'Bianca',
        items: [{ productId: 1, quantity: 1 }],
      },
    });
  });

  it('sem o nome pede para quem é, antes dos itens', () => {
    expect(buildConsumptionRequest(' ', [])).toEqual({
      ok: false,
      error: 'Diga para quem é o consumo (ex.: Bianca, Motoboy, Equipe)',
    });
  });

  it('sem itens pede o primeiro item', () => {
    expect(buildConsumptionRequest('Bianca', [])).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^Lance pelo menos um item/),
    });
  });
});
