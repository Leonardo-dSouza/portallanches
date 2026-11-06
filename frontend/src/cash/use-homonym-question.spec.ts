import { act, renderHook } from '@testing-library/react';
import { useHomonymQuestion, type HomonymView } from './use-homonym-question';

const VIEW: HomonymView = {
  name: 'Thiago',
  recordAddress: 'Rua A, 12 · Monterrey',
  typedAddress: 'Rua B, 12 · Monterrey',
};

describe('useHomonymQuestion', () => {
  it('abre com o que mostrar; a resposta fecha e segue o salvar', () => {
    const answers: string[] = [];
    const { result } = renderHook(() => useHomonymQuestion());
    expect(result.current.view).toBeNull();
    act(() => result.current.ask(VIEW, (answer) => answers.push(answer)));
    expect(result.current.view).toEqual(VIEW);
    act(() => result.current.answer('other'));
    expect(result.current.view).toBeNull();
    expect(answers).toEqual(['other']);
  });

  it('cancelar fecha sem seguir o salvar', () => {
    const answers: string[] = [];
    const { result } = renderHook(() => useHomonymQuestion());
    act(() => result.current.ask(VIEW, (answer) => answers.push(answer)));
    act(() => result.current.cancel());
    expect(result.current.view).toBeNull();
    expect(answers).toEqual([]);
  });
});
