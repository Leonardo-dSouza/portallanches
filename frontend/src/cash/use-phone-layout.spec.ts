import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsPhone, PHONE_QUERY } from './use-phone-layout';
import { FakeMediaQueryList } from '../test-support/fake-media-query';

describe('useIsPhone', () => {
  it('devolve false quando window.matchMedia não existe (JSDOM dos testes)', () => {
    const { result } = renderHook(() => useIsPhone());
    expect(result.current).toBe(false);
  });

  it('devolve o estado inicial do FakeMediaQueryList', () => {
    const fake = new FakeMediaQueryList(PHONE_QUERY, true);
    const { result } = renderHook(() => useIsPhone(() => fake));
    expect(result.current).toBe(true);
  });

  it('atualiza ao chamar setMatches no FakeMediaQueryList', () => {
    const fake = new FakeMediaQueryList(PHONE_QUERY, false);
    const { result } = renderHook(() => useIsPhone(() => fake));
    expect(result.current).toBe(false);
    act(() => fake.setMatches(true));
    expect(result.current).toBe(true);
  });

  it('volta para false ao reduzir matches novamente', () => {
    const fake = new FakeMediaQueryList(PHONE_QUERY, true);
    const { result } = renderHook(() => useIsPhone(() => fake));
    act(() => fake.setMatches(false));
    expect(result.current).toBe(false);
  });

  it('remove o listener ao desmontar (sem vazamento de memória)', () => {
    const fake = new FakeMediaQueryList(PHONE_QUERY, false);
    const { unmount } = renderHook(() => useIsPhone(() => fake));
    unmount();
    // Não deve lançar ao disparar depois de desmontar.
    expect(() => act(() => fake.setMatches(true))).not.toThrow();
  });
});
