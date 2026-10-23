import { ownerColumns } from './sale-owner.js';

describe('ownerColumns', () => {
  it('pedido preenche só o orderId', () => {
    expect(ownerColumns({ orderId: 7 })).toEqual({
      orderId: 7,
      staffConsumptionId: null,
    });
  });

  it('consumo interno preenche só o staffConsumptionId', () => {
    expect(ownerColumns({ staffConsumptionId: 3 })).toEqual({
      orderId: null,
      staffConsumptionId: 3,
    });
  });
});
