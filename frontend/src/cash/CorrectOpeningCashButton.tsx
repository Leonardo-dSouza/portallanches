import { Pencil } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Money } from '../api/types';
import { OpeningDrawerDialog } from './OpeningDrawerDialog';

export interface CorrectOpeningCashButtonProps {
  cash: CashApi;
  openingCash: Money;
  onSaved(): void;
}

/**
 * Tecla que abre o diálogo em modo correção para o admin ajustar o troco inicial.
 *
 * @example <CorrectOpeningCashButton cash={cash} openingCash="30.00" onSaved={reload} />
 */
export function CorrectOpeningCashButton({
  cash,
  openingCash,
  onSaved,
}: CorrectOpeningCashButtonProps) {
  const [open, setOpen] = useState(false);
  const handleSaved = () => {
    setOpen(false);
    onSaved();
  };
  return (
    <>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => setOpen(true)}
      >
        <Pencil aria-hidden />
        Corrigir troco inicial
      </button>
      {open && (
        <OpeningDrawerDialog
          cash={cash}
          initialAmount={openingCash}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
