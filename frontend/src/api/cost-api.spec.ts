import { describe, expect, it } from 'vitest';
import { FakeApiClient } from '../test-support/fake-api-client';
import { createCostApi } from './cost-api';
import type { CostChanges } from './cost-types';

describe('createCostApi', () => {
  it('sheet busca a planilha de custos', async () => {
    const client = new FakeApiClient();
    const api = createCostApi(client);

    const sheet = await api.sheet();

    expect(client.lines).toContain('GET /costs');
    expect(sheet.snapshot.supplies).toHaveLength(3);
    expect(sheet.snapshot.supplies[0].name).toBe('Acém');
  });

  it('preview envia as mudanças para cálculo de impacto', async () => {
    const client = new FakeApiClient();
    const api = createCostApi(client);
    const changes: CostChanges = {
      basePrices: [
        {
          supplyId: 1,
          basePrice: '45.00',
          baseQuantity: '1',
          baseLabel: 'kg',
        },
      ],
      recipes: [],
      removedRecipeSupplyIds: [],
      components: [],
      salePrices: [],
    };

    const preview = await api.preview(changes);

    expect(client.lines).toContain('POST /costs/preview');
    expect(preview.impact.supplies).toHaveLength(1);
    expect(preview.impact.supplies[0].after).toBe('45.0000');
  });

  it('apply envia mudanças e basedOnChangeSetId', async () => {
    const client = new FakeApiClient();
    const api = createCostApi(client);
    const changes: CostChanges = {
      basePrices: [],
      recipes: [],
      removedRecipeSupplyIds: [],
      components: [],
      salePrices: [],
    };

    const result = await api.apply(changes, 1);

    expect(client.lines).toContain('POST /costs/apply');
    expect(result.changeSetId).toBe(2);
    expect(client.costs.lastAppliedChanges).toEqual({
      changes,
      basedOnChangeSetId: 1,
    });
  });

  it('history consulta histórico do insumo', async () => {
    const client = new FakeApiClient();
    client.costs.historyRows = [
      {
        createdAt: '2026-11-13T20:00:00.000Z',
        userName: 'admin',
        oldUnitCost: '39.9000',
        newUnitCost: '45.0000',
        oldBasePrice: '39.90',
        newBasePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      },
    ];
    const api = createCostApi(client);

    const rows = await api.history(1);

    expect(client.lines).toContain('GET /costs/history?supplyId=1');
    expect(rows).toHaveLength(1);
    expect(rows[0].newBasePrice).toBe('45.00');
  });
});
