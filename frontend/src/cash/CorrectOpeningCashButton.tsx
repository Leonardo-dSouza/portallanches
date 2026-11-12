import { Pencil } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Money } from '../api/types';
import { useAuth } from '../auth/auth-context';
import { useAppSettings } from '../settings/app-settings-context';
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

interface OpeningCashCorrectionProps {
  cash: CashApi;
  /** Nulo na noite sem abertura (ex.: dia antigo): o diálogo nasce com o padrão de Cadastros. */
  openingCash: Money | null;
  onSaved(): void;
}

/**
 * A tecla do quadro Conferência: só o admin corrige o troco inicial (o caixa grava uma vez, na
 * abertura; a API devolve 409 na segunda).
 *
 * @example <OpeningCashCorrection cash={cash} openingCash={report.drawer.openingCash} onSaved={reload} />
 */
export function OpeningCashCorrection({
  cash,
  openingCash,
  onSaved,
}: OpeningCashCorrectionProps) {
  const isAdmin = useAuth().user?.role === 'ADMIN';
  const { drawerOpeningDefault } = useAppSettings();
  if (!isAdmin) return null;
  return (
    <CorrectOpeningCashButton
      cash={cash}
      openingCash={openingCash ?? drawerOpeningDefault}
      onSaved={onSaved}
    />
  );
}
