import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { costTabSheet, fakeCostDraft } from '../test-support/cost-tab-fixture';
import { TestPriceBox } from './TestPriceBox';

describe('TestPriceBox', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const draft = fakeCostDraft(costTabSheet(), {
      profit: '2.12',
      marginPercent: '11.8',
    });
    render(<TestPriceBox productId={8} draft={draft} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    return {
      draft,
      user,
      input: screen.getByLabelText('Testar outro preço R$'),
    };
  };

  it('simula o lucro do preço digitado sem mexer no cardápio', async () => {
    const { draft, user, input } = setup();

    await user.type(input, '18,00');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(draft.simulateSalePrice).toHaveBeenLastCalledWith(8, '18.00');
    expect(await screen.findByText('R$ 2,12')).toBeVisible();
    expect(screen.getByText('11,8%')).toBeVisible();
    expect(
      screen.getByText(
        'Só testa: o cardápio não muda. O preço muda em Cadastros, quando você for anunciar.',
      ),
    ).toBeVisible();
  });

  it('texto que não é preço avisa e não chama a API', async () => {
    const { draft, user, input } = setup();

    await user.type(input, 'abc');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Digite um preço (ex.: 18,00)')).toBeVisible();
    expect(draft.simulateSalePrice).not.toHaveBeenCalled();
  });
});
