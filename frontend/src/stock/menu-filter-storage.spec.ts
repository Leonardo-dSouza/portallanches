import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalMenuFilterStorage,
  useMenuFilter,
  type MenuFilterStorage,
  type StockTabWithMenuFilter,
} from './menu-filter-storage';

/** Fake em memória para testar o hook sem depender do DOM global. */
class FakeMemoryFilterStorage implements MenuFilterStorage {
  private readonly items = new Map<StockTabWithMenuFilter, boolean>();

  load(tab: StockTabWithMenuFilter): boolean | null {
    return this.items.get(tab) ?? null;
  }

  save(tab: StockTabWithMenuFilter, soldInMenuOnly: boolean): void {
    this.items.set(tab, soldInMenuOnly);
  }
}

describe('createLocalMenuFilterStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('retorna null quando nada foi salvo ainda', () => {
    const storage = createLocalMenuFilterStorage();
    expect(storage.load('status')).toBeNull();
    expect(storage.load('count')).toBeNull();
  });

  it('salva e lê a escolha por aba de forma independente', () => {
    const storage = createLocalMenuFilterStorage();
    storage.save('status', false);
    storage.save('count', true);

    expect(storage.load('status')).toBe(false);
    expect(storage.load('count')).toBe(true);
  });

  it('devolve null quando localStorage lança exceção ao carregar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota or permission denied');
    });
    const storage = createLocalMenuFilterStorage();
    expect(storage.load('status')).toBeNull();
  });

  it('não quebra quando localStorage lança exceção ao salvar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota or permission denied');
    });
    const storage = createLocalMenuFilterStorage();
    expect(() => storage.save('status', false)).not.toThrow();
  });
});

describe('useMenuFilter', () => {
  it('inicia como true por padrão quando nada foi salvo', () => {
    const storage = new FakeMemoryFilterStorage();
    const { result } = renderHook(() => useMenuFilter('status', storage));

    expect(result.current[0]).toBe(true);
  });

  it('respeita a escolha previamente salva no storage', () => {
    const storage = new FakeMemoryFilterStorage();
    storage.save('status', false);
    const { result } = renderHook(() => useMenuFilter('status', storage));

    expect(result.current[0]).toBe(false);
  });

  it('atualiza o estado e grava no storage ao trocar a opção', () => {
    const storage = new FakeMemoryFilterStorage();
    const { result } = renderHook(() => useMenuFilter('status', storage));

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(storage.load('status')).toBe(false);
  });
});
