import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../auth/auth-decorators.js';
import type { SessionUser } from '../auth/session-user.js';
import { FakePurchaseRepository } from './purchase-fakes.fixture.js';
import { PurchaseService } from './purchase.service.js';
import { PurchasesController } from './purchases.controller.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };

function classRoles(): unknown {
  return new Reflector().get(ROLES_KEY, PurchasesController);
}

function methodRoles(method: keyof PurchasesController): unknown {
  const handler = Object.getOwnPropertyDescriptor(
    PurchasesController.prototype,
    method,
  )?.value as () => unknown;
  return new Reflector().get(ROLES_KEY, handler);
}

function build() {
  const repo = new FakePurchaseRepository();
  repo.vendors.set(1, {
    id: 1,
    cnpjRoot: '11222333',
    legalName: 'MERCADO EXEMPLO',
    nickname: null,
  });
  repo.supplies.set(10, { id: 10, name: 'Hambúrguer 56g', unitCost: '1.2444' });
  const service = new PurchaseService(repo);
  const controller = new PurchasesController(service);
  return { controller, service, repo };
}

describe('PurchasesController', () => {
  it('controller inteiro é restrito a ADMIN (@Roles)', () => {
    expect(classRoles()).toEqual(['ADMIN']);
  });

  it('rotas novas PUT /item-links e DELETE /item-links/:vendorId/:code possuem @Roles ADMIN', () => {
    // Por herança de classe do NestJS ou anotação direta
    const effectiveClassRoles = classRoles();
    expect(effectiveClassRoles).toEqual(['ADMIN']);
    expect(methodRoles('saveItemLink') ?? effectiveClassRoles).toEqual([
      'ADMIN',
    ]);
    expect(methodRoles('deleteItemLink') ?? effectiveClassRoles).toEqual([
      'ADMIN',
    ]);
  });

  it('saveItemLink e deleteItemLink delegam para o PurchaseService', async () => {
    const { controller, repo } = build();

    const saved = await controller.saveItemLink(ADMIN, {
      vendorId: 1,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '36',
      label: 'cx 36',
    });
    expect(saved).toMatchObject({
      vendorId: 1,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '36',
      label: 'cx 36',
    });
    expect(repo.links.size).toBe(1);

    await controller.deleteItemLink(1, '1128810');
    expect(repo.links.size).toBe(0);
  });
});
