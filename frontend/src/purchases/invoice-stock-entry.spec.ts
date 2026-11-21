import { describe, expect, it } from 'vitest';
import {
  buildInvoiceStockEntryPayload,
  canMarkItemForStockEntry,
  formatStockEnteredBadge,
  formatStockEntryButtonLabel,
  formatStockEntryConversion,
  initialStockEntryItemIds,
  isEligibleForStockEntry,
  selectionAfterLink,
} from './invoice-stock-entry';

describe('invoice-stock-entry pure functions', () => {
  describe('canMarkItemForStockEntry', () => {
    it('permite marcar apenas item ligado e que não seja fora da lanchonete', () => {
      const linked = {
        outsideBusiness: false,
        link: {
          supplyId: 10,
          supplyName: 'Hambúrguer',
          baseQuantity: '36',
          label: 'cx',
          deductOnSale: true,
        },
      };
      expect(canMarkItemForStockEntry(linked)).toBe(true);
    });

    it('item ligado a insumo sem baixa na venda não pode ser marcado (estoque pela contagem)', () => {
      const countOnly = {
        outsideBusiness: false,
        link: {
          supplyId: 128,
          supplyName: 'Oreo',
          baseQuantity: '0.27',
          label: 'pacote 270 g',
          deductOnSale: false,
        },
      };
      expect(canMarkItemForStockEntry(countOnly)).toBe(false);
    });

    it('item sem ligação não pode ser marcado', () => {
      const unlinked = { outsideBusiness: false, link: null };
      expect(canMarkItemForStockEntry(unlinked)).toBe(false);
    });

    it('item fora da lanchonete não pode ser marcado, mesmo que ligado', () => {
      const outside = {
        outsideBusiness: true,
        link: {
          supplyId: 10,
          supplyName: 'Hambúrguer',
          baseQuantity: '36',
          label: 'cx',
          deductOnSale: true,
        },
      };
      expect(canMarkItemForStockEntry(outside)).toBe(false);
    });
  });

  describe('initialStockEntryItemIds', () => {
    it('começa com todos os itens ligados e dentro da lanchonete marcados', () => {
      const items = [
        {
          id: 1,
          outsideBusiness: false,
          link: {
            supplyId: 10,
            supplyName: 'Hambúrguer',
            baseQuantity: '36',
            label: 'cx',
            deductOnSale: true,
          },
        },
        { id: 2, outsideBusiness: false, link: null },
        {
          id: 3,
          outsideBusiness: true,
          link: {
            supplyId: 20,
            supplyName: 'Queijo',
            baseQuantity: '1',
            label: null,
            deductOnSale: true,
          },
        },
        {
          id: 4,
          outsideBusiness: false,
          link: {
            supplyId: 30,
            supplyName: 'Bacon',
            baseQuantity: '1',
            label: null,
            deductOnSale: true,
          },
        },
        {
          id: 5,
          outsideBusiness: false,
          link: {
            supplyId: 128,
            supplyName: 'Oreo',
            baseQuantity: '0.27',
            label: 'pacote 270 g',
            deductOnSale: false,
          },
        },
      ];
      expect(initialStockEntryItemIds(items)).toEqual([1, 4]);
    });
  });

  describe('selectionAfterLink', () => {
    const linkTo = (deductOnSale: boolean) => ({
      supplyId: 10,
      supplyName: 'Insumo',
      baseQuantity: '1',
      label: null,
      deductOnSale,
    });

    it('marca o item recém-ligado a insumo com baixa na venda', () => {
      const items = [{ id: 7, outsideBusiness: false, link: linkTo(true) }];
      expect([...selectionAfterLink(new Set([1]), 7, items)]).toEqual([1, 7]);
    });

    it('tira o item religado a insumo sem baixa na venda', () => {
      const items = [{ id: 7, outsideBusiness: false, link: linkTo(false) }];
      expect([...selectionAfterLink(new Set([1, 7]), 7, items)]).toEqual([1]);
    });

    it('tira também a outra linha do mesmo código, que mudou junto (a ligação é por código)', () => {
      const items = [
        { id: 3, outsideBusiness: false, link: linkTo(false) },
        { id: 7, outsideBusiness: false, link: linkTo(false) },
      ];
      expect([...selectionAfterLink(new Set([3, 7]), 3, items)]).toEqual([]);
    });

    it('não marca quando a nota recarregada não traz o item', () => {
      expect([...selectionAfterLink(new Set([1]), 7, [])]).toEqual([1]);
    });
  });

  describe('formatStockEntryConversion', () => {
    it('formata quantidade multiplicada pela base (ex.: 2 Cx → 72 un)', () => {
      expect(formatStockEntryConversion('2', 'Cx', '36')).toBe('2 Cx → 72 un');
    });

    it('formata decimais com vírgula padrão brasileiro', () => {
      expect(formatStockEntryConversion('1.5', 'kg', '2')).toBe(
        '1,5 kg → 3 un',
      );
    });
  });

  describe('buildInvoiceStockEntryPayload', () => {
    it('monta o corpo do POST só com os marcados', () => {
      const selected = [10, 20];
      const dates = { 10: '2026-11-20', 30: '2026-12-01' };
      const payload = buildInvoiceStockEntryPayload(selected, dates);
      expect(payload).toEqual({
        items: [
          { itemId: 10, expiresOn: '2026-11-20' },
          { itemId: 20, expiresOn: null },
        ],
      });
    });

    it('validade vazia vai como null', () => {
      const payload = buildInvoiceStockEntryPayload([1, 2], {
        1: '',
        2: '   ',
      });
      expect(payload).toEqual({
        items: [
          { itemId: 1, expiresOn: null },
          { itemId: 2, expiresOn: null },
        ],
      });
    });
  });

  describe('formatStockEnteredBadge', () => {
    it('formata o selo com data dia/mês e nome do usuário', () => {
      expect(
        formatStockEnteredBadge('2026-11-14T15:30:00.000Z', 'Leonardo'),
      ).toBe('No estoque · 14/11 · Leonardo');
    });

    it('formata o selo mesmo sem nome', () => {
      expect(formatStockEnteredBadge('2026-11-14T15:30:00.000Z', null)).toBe(
        'No estoque · 14/11',
      );
    });
  });

  describe('isEligibleForStockEntry', () => {
    it('nota a partir de 14/11/2026 não lançada e para admin é elegível', () => {
      expect(
        isEligibleForStockEntry('2026-11-14T12:00:00.000Z', null, true),
      ).toBe(true);
      expect(
        isEligibleForStockEntry('2026-11-20T10:00:00.000Z', null, true),
      ).toBe(true);
    });

    it('nota anterior a 14/11 não é elegível', () => {
      expect(
        isEligibleForStockEntry('2026-11-13T23:59:59.000Z', null, true),
      ).toBe(false);
      expect(
        isEligibleForStockEntry('2026-09-22T20:00:00.000Z', null, true),
      ).toBe(false);
    });

    it('nota já lançada não é elegível', () => {
      expect(
        isEligibleForStockEntry(
          '2026-11-14T12:00:00.000Z',
          '2026-11-14T15:00:00.000Z',
          true,
        ),
      ).toBe(false);
    });

    it('usuário que não seja admin não é elegível', () => {
      expect(
        isEligibleForStockEntry('2026-11-14T12:00:00.000Z', null, false),
      ).toBe(false);
    });
  });

  describe('formatStockEntryButtonLabel', () => {
    it('formata o texto da tecla com o plural correto', () => {
      expect(formatStockEntryButtonLabel(0)).toBe('Lançar 0 itens no estoque');
      expect(formatStockEntryButtonLabel(1)).toBe('Lançar 1 item no estoque');
      expect(formatStockEntryButtonLabel(3)).toBe('Lançar 3 itens no estoque');
    });
  });
});
