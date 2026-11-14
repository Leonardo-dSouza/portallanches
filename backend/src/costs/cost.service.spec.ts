import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionUser } from '../auth/session-user.js';
import { FakeCostRepository } from './cost-fakes.fixture.js';
import { CostService } from './cost.service.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const FIXED_CLOCK = () => new Date('2026-11-13T20:00:00Z');
const TIMEZONE = 'America/Sao_Paulo';

describe('CostService', () => {
  let fakeRepo: FakeCostRepository;
  let service: CostService;

  beforeEach(() => {
    fakeRepo = new FakeCostRepository();
    service = new CostService(fakeRepo, FIXED_CLOCK, TIMEZONE);
  });

  describe('sheet', () => {
    it('retorna snapshot, produtos calculados e ids de insumos incompletos', async () => {
      const sheet = await service.sheet();
      expect(sheet.snapshot.lastChangeSetId).toBe(7);
      expect(sheet.products.length).toBe(3);
      // Alface (id 6) não possui custo no fixture.
      expect(sheet.incompleteSupplyIds).toEqual([6]);
    });
  });

  describe('preview', () => {
    it('calcula o depois e o impacto sem persistir alterações', async () => {
      const result = await service.preview({
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

      expect(result.snapshot.supplies.find((s) => s.id === 1)?.unitCost).toBe(
        '45',
      );
      expect(result.impact.supplies.map((s) => s.supplyId)).toEqual([1, 10]);
      // Não gravou no repositório.
      expect(fakeRepo.recordedChangeSets).toHaveLength(0);
    });
  });

  describe('apply', () => {
    it('grava change set com resumo e supplyChanges com acém e hambúrguer produzido', async () => {
      const result = await service.apply(ADMIN, {
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

      expect(result.changeSetId).toBe(8);
      expect(fakeRepo.recordedChangeSets).toHaveLength(1);
      expect(fakeRepo.recordedChangeSets[0]?.summary).toBe(
        'Acém 36,90 → 45,00',
      );

      // Insumo 1 (Acém) e Insumo 10 (Hambúrguer artesanal derivado) no histórico:
      const recordedIds = fakeRepo.recordedHistories.map((h) => h.supplyId);
      expect(recordedIds).toContain(1);
      expect(recordedIds).toContain(10);
    });

    it('lança ConflictException quando basedOnChangeSetId for velho e nada é gravado', async () => {
      await expect(
        service.apply(ADMIN, {
          basedOnChangeSetId: 6,
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
        }),
      ).rejects.toThrow(ConflictException);

      expect(fakeRepo.recordedChangeSets).toHaveLength(0);
    });

    it('lança BadRequestException se basedOnChangeSetId for inválido', async () => {
      await expect(
        service.apply(ADMIN, {
          basedOnChangeSetId: 'invalido',
          changes: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança UnprocessableEntityException (422) quando o rascunho for vazio', async () => {
      await expect(
        service.apply(ADMIN, {
          basedOnChangeSetId: 7,
          changes: {},
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(fakeRepo.recordedChangeSets).toHaveLength(0);
    });
  });

  describe('history', () => {
    it('lança BadRequestException (400) se supplyId for inválido', async () => {
      await expect(service.history('abc')).rejects.toThrow(BadRequestException);
      await expect(service.history('-1')).rejects.toThrow(BadRequestException);
      await expect(service.history(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('retorna o histórico do insumo solicitado', async () => {
      // Aplica uma alteração no insumo 1.
      await service.apply(ADMIN, {
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

      const historyRows = await service.history('1');
      expect(historyRows).toHaveLength(1);
      expect(historyRows[0]?.oldBasePrice).toBe('36.90');
      expect(historyRows[0]?.newBasePrice).toBe('45.00');
      expect(historyRows[0]?.newUnitCost).toBe('45');
    });
  });
});
