import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ManagerAuthDialog } from './ManagerAuthDialog';
import type { ManagerRetry } from './use-manager-retry';

function fakeRetry(overrides: Partial<ManagerRetry> = {}): ManagerRetry {
  return {
    reason: 'Reabrir a noite de 22/09',
    error: null,
    busy: false,
    run: vi.fn(),
    ask: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

describe('ManagerAuthDialog (2026-11-15)', () => {
  it('título, motivo, rótulo e campo aceitando apenas dígitos até 6 números', async () => {
    const retry = fakeRetry();
    render(<ManagerAuthDialog retry={retry} />);

    expect(
      screen.getByRole('heading', { name: 'Código do gerente' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Reabrir a noite de 22\/09: precisa do código do gerente\./,
      ),
    ).toBeInTheDocument();

    const input = screen.getByLabelText('Código do gerente (6 números)');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '6');

    // Digita letras e números misturados: letras e símbolos somem
    await userEvent.type(input, 'a1-2b3c4d5e6f7');
    expect(input).toHaveValue('123456');
  });

  it('botão "Autorizar" só habilita com exatamente 6 números', async () => {
    const retry = fakeRetry();
    render(<ManagerAuthDialog retry={retry} />);

    const button = screen.getByRole('button', { name: /Autorizar/ });
    const input = screen.getByLabelText('Código do gerente (6 números)');

    // Vazio: desabilitado
    expect(button).toBeDisabled();

    // 5 dígitos: ainda desabilitado
    await userEvent.type(input, '12345');
    expect(button).toBeDisabled();

    // 6º dígito: habilitado
    await userEvent.type(input, '6');
    expect(button).toBeEnabled();

    // Submete
    await userEvent.click(button);
    expect(retry.submit).toHaveBeenCalledWith('123456');
  });

  it('botão "Voltar" cancela a tentativa', async () => {
    const retry = fakeRetry();
    render(<ManagerAuthDialog retry={retry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(retry.cancel).toHaveBeenCalled();
  });
});
