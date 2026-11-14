import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCostApi } from '../api/cost-api';
import type { CostPreview } from '../api/cost-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { useCostDraft } from './use-cost-draft';

describe('useCostDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('duas mudanças seguidas disparam uma prévia depois do debounce de 300 ms', async () => {
    const client = new FakeApiClient();
    const costApi = createCostApi(client);
    const previewSpy = vi.spyOn(costApi, 'preview');

    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.sheet).not.toBeNull();
    expect(previewSpy).not.toHaveBeenCalled();

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '42.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    expect(previewSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(previewSpy).toHaveBeenCalledTimes(1);
    expect(result.current.preview).not.toBeNull();
  });

  it('mudar o mesmo insumo duas vezes mantém changeCount 1', async () => {
    const client = new FakeApiClient();
    const costApi = createCostApi(client);
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '42.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    expect(result.current.changeCount).toBe(1);
  });

  it('discard zera o rascunho e a prévia', async () => {
    const client = new FakeApiClient();
    const costApi = createCostApi(client);
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(result.current.preview).not.toBeNull();

    act(() => {
      result.current.discard();
    });

    expect(result.current.changeCount).toBe(0);
    expect(result.current.preview).toBeNull();
  });

  it('save com 409 define conflict true e mantém o rascunho', async () => {
    const client = new FakeApiClient();
    client.costs.conflictOnApply = true;
    const costApi = createCostApi(client);
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.conflict).toBe(true);
    expect(result.current.changeCount).toBe(1);
  });

  it('save com sucesso recarrega o sheet e zera o rascunho', async () => {
    const client = new FakeApiClient();
    const costApi = createCostApi(client);
    const sheetSpy = vi.spyOn(costApi, 'sheet');
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });
    expect(sheetSpy).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.conflict).toBe(false);
    expect(result.current.changeCount).toBe(0);
    expect(result.current.preview).toBeNull();
    expect(sheetSpy).toHaveBeenCalledTimes(2);
  });

  it('save com erro qualquer preenche mensagem de erro', async () => {
    const client = new FakeApiClient();
    client.costs.errorOnApply = 'Valor inválido';
    const costApi = createCostApi(client);
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).toBe('Valor inválido');
    expect(result.current.conflict).toBe(false);
  });

  it('reload descarta rascunho e relê a planilha', async () => {
    const client = new FakeApiClient();
    const costApi = createCostApi(client);
    const sheetSpy = vi.spyOn(costApi, 'sheet');
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setBasePrice({
        supplyId: 1,
        basePrice: '45.00',
        baseQuantity: '1',
        baseLabel: 'kg',
      });
    });
    expect(result.current.changeCount).toBe(1);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.changeCount).toBe(0);
    expect(result.current.conflict).toBe(false);
    expect(sheetSpy).toHaveBeenCalledTimes(2);
  });
  it('prévia que chega depois do Descartar não reaparece', async () => {
    const costApi = createCostApi(new FakeApiClient());
    let answer: (value: CostPreview) => void = () => undefined;
    vi.spyOn(costApi, 'preview').mockReturnValue(
      new Promise<CostPreview>((resolve) => {
        answer = resolve;
      }),
    );
    const { result } = renderHook(() => useCostDraft(costApi));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.setSalePrice({ productId: 1, salePrice: '20.00' });
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    act(() => result.current.discard());
    const lateAnswer = {
      ...result.current.sheet!,
      impact: { supplies: [], products: [], becameBelowTarget: 0 },
    };
    await act(async () => {
      answer(lateAnswer);
      await Promise.resolve();
    });

    expect(result.current.preview).toBeNull();
    expect(result.current.changeCount).toBe(0);
  });
});
