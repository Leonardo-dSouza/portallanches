import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/auth-decorators.js';
import { ProductsController } from './products.controller.js';

/** Os perfis do `@Roles` do método (undefined = qualquer logado). */
function rolesOf(method: keyof ProductsController): unknown {
  const handler = Object.getOwnPropertyDescriptor(
    ProductsController.prototype,
    method,
  )?.value as () => unknown;
  return new Reflector().get(ROLES_KEY, handler);
}

describe('ProductsController', () => {
  // Regressão de 2026-10-25: o GET /products traz o CMV e o custo de cada insumo.
  it('a lista com o CMV é só do admin', () => {
    expect(rolesOf('list')).toEqual(['ADMIN']);
  });

  it('o cardápio do dia (só preço de venda) fica aberto ao caixa', () => {
    expect(rolesOf('listForSale')).toBeUndefined();
  });
});
