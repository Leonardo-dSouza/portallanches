import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../auth/auth-decorators.js';
import type { SessionUser } from '../auth/session-user.js';
import { FakeCostRepository } from './cost-fakes.fixture.js';
import { CostService } from './cost.service.js';
import { CostsController } from './costs.controller.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CLOCK = () => new Date('2026-11-13T20:00:00Z');
const TIMEZONE = 'America/Sao_Paulo';

function rolesOf(method: keyof CostsController): unknown {
  const handler = Object.getOwnPropertyDescriptor(
    CostsController.prototype,
    method,
  )?.value as () => unknown;
  return new Reflector().get(ROLES_KEY, handler);
}

function buildController() {
  const repo = new FakeCostRepository();
  const service = new CostService(repo, CLOCK, TIMEZONE);
  const controller = new CostsController(service);
  return { controller, service, repo };
}

describe('CostsController', () => {
  it('todas as rotas são restritas a ADMIN (@Roles)', () => {
    expect(rolesOf('sheet')).toEqual(['ADMIN']);
    expect(rolesOf('preview')).toEqual(['ADMIN']);
    expect(rolesOf('apply')).toEqual(['ADMIN']);
    expect(rolesOf('history')).toEqual(['ADMIN']);
  });

  it('repassa chamadas para os métodos do serviço de custos', async () => {
    const { controller } = buildController();

    const sheet = await controller.sheet();
    expect(sheet.snapshot.lastChangeSetId).toBe(7);

    const preview = await controller.preview({
      changes: {
        basePrices: [
          {
            supplyId: 1,
            basePrice: '45.00',
            baseQuantity: '1',
            baseLabel: null,
          },
        ],
      },
    });
    expect(preview.impact.supplies).toHaveLength(2);

    const applyResult = await controller.apply(ADMIN, {
      basedOnChangeSetId: 7,
      changes: {
        basePrices: [
          {
            supplyId: 1,
            basePrice: '45.00',
            baseQuantity: '1',
            baseLabel: null,
          },
        ],
      },
    });
    expect(applyResult.changeSetId).toBe(8);

    const history = await controller.history('1');
    expect(history).toHaveLength(1);
    expect(history[0]?.newUnitCost).toBe('45');
  });
});
