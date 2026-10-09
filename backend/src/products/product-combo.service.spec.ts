import { UnprocessableEntityException } from '@nestjs/common';
import { build, X_SALADA } from './product-fakes.fixture.js';

/** Hambúrguer 56g sozinho (R$ 2,35 de custo), no papel de uma lata de refri. */
const LATA = {
  categoryId: 1,
  name: 'Guaraná lata',
  salePrice: '6.00',
  components: [{ supplyId: 7, quantity: 1 }],
};

const combo = (items: { productId: number; quantity: number }[]) => ({
  categoryId: 1,
  name: 'Combo X Salada + Guaraná',
  salePrice: '19.00',
  bundleItems: items,
});

async function withXSaladaAndLata() {
  const built = build();
  const xSalada = await built.service.create(X_SALADA);
  const lata = await built.service.create(LATA);
  return { ...built, xSalada, lata };
}

describe('ProductService: combos', () => {
  it('o CMV do combo é a soma dos itens vezes a quantidade', async () => {
    const { service, xSalada, lata } = await withXSaladaAndLata();
    const created = await service.create(
      combo([
        { productId: xSalada.id, quantity: 1 },
        { productId: lata.id, quantity: 2 },
      ]),
    );
    // X Salada 3,79 (0,036 × 39,90 + 2,35) + 2 × 2,35 = 8,4864 → 8,49
    expect(created).toMatchObject({ cmv: '8.49', cmvComplete: true });
    expect(created.bundleItems.map((i) => i.productName)).toEqual([
      'X Salada',
      'Guaraná lata',
    ]);
  });

  it('item inexistente → 422 citando os ids', async () => {
    const { service } = await withXSaladaAndLata();
    await expect(
      service.create(combo([{ productId: 77, quantity: 1 }])),
    ).rejects.toThrow(/inexistentes no combo: 77/);
  });

  it('combo dentro de combo → 422 (um nível só)', async () => {
    const { service, xSalada } = await withXSaladaAndLata();
    const first = await service.create(
      combo([{ productId: xSalada.id, quantity: 1 }]),
    );
    await expect(
      service.create({
        ...combo([{ productId: first.id, quantity: 1 }]),
        name: 'Combo duplo',
      }),
    ).rejects.toThrow(/já são combos: 3/);
  });

  it('combo não contém a si mesmo', async () => {
    const { service, xSalada } = await withXSaladaAndLata();
    const created = await service.create(
      combo([{ productId: xSalada.id, quantity: 1 }]),
    );
    await expect(
      service.update(
        created.id,
        combo([{ productId: created.id, quantity: 1 }]),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('produto que está dentro de um combo não vira combo', async () => {
    const { service, xSalada, lata } = await withXSaladaAndLata();
    await service.create(combo([{ productId: xSalada.id, quantity: 1 }]));
    await expect(
      service.update(xSalada.id, {
        ...combo([{ productId: lata.id, quantity: 1 }]),
        name: 'X Salada',
      }),
    ).rejects.toThrow(/está dentro de um combo/);
  });
});
