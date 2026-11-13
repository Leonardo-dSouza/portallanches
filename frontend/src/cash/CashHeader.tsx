import { Banknote, HandCoins, RefreshCw } from 'lucide-react';
import { formatMoney } from '../api/money';
import { useAuth } from '../auth/auth-context';
import { formatDateWithWeekday } from '../history/date-keys';
import { DayPicker } from './DayPicker';
import { openAccountsSummary } from './open-accounts';
import type { CashDay } from './use-cash-day';

const STATUS_LABEL = { OPEN: 'Aberto', CLOSED: 'Fechado' } as const;

interface CashHeaderProps {
  day: CashDay;
  isToday: boolean;
  today: string;
  onRefresh(): void;
  onPickDate(date: string | null): void;
  /** Leva à aba Pedidos com o filtro A pagar (card 8). */
  onShowOpenAccounts(): void;
  /** Presente enquanto a noite espera o troco inicial e o diálogo está fechado (hotfix 2026-11-13). */
  onOpenDrawer?: () => void;
}

/** A tecla que traz de volta o diálogo de abertura depois do "Agora não" (ou para o admin). */
function OpenDrawerKey({ onOpen }: { onOpen?: () => void }) {
  if (!onOpen) return null;
  return (
    <button
      type="button"
      className="button button-sm whitespace-nowrap"
      title="Informar o troco inicial da gaveta"
      onClick={onOpen}
    >
      <Banknote aria-hidden />
      Abrir o caixa
    </button>
  );
}

/**
 * O A pagar no topo do caixa (card 8, 2026-11-08): a conta aberta não pode sumir na lista. Só
 * na noite aberta e só quando tem; o clique leva ao filtro A pagar.
 */
function OpenAccountsKey({ day, onShow }: { day: CashDay; onShow(): void }) {
  const { count, total } = openAccountsSummary(day.orders);
  if (day.closing.status !== 'OPEN' || count === 0) return null;
  return (
    <button
      type="button"
      className="button button-sm cash-header-open"
      title="Ver as contas A pagar"
      onClick={onShow}
    >
      <HandCoins aria-hidden />A pagar: {count} · {formatMoney(total)}
    </button>
  );
}

export function CashHeader({
  day,
  isToday,
  today,
  onRefresh,
  onPickDate,
  onShowOpenAccounts,
  onOpenDrawer,
}: CashHeaderProps) {
  const { businessDate, status } = day.closing;
  // O caixa fica na noite em andamento (2026-10-15): dia passado é com o admin.
  const isAdmin = useAuth().user?.role === 'ADMIN';
  return (
    <div className="cash-header">
      {/* Sem o "Fechamento diário" em cima (2026-10-11): cada linha conta na tela do caixa. */}
      <h1>
        Caixa{' '}
        <span className="cash-header-date">
          de {formatDateWithWeekday(businessDate)}
        </span>
      </h1>
      <span className="badge" data-status={status}>
        {STATUS_LABEL[status]}
      </span>
      <OpenDrawerKey onOpen={onOpenDrawer} />
      <OpenAccountsKey day={day} onShow={onShowOpenAccounts} />
      {isAdmin && (
        <DayPicker
          value={businessDate}
          today={today}
          isToday={isToday}
          onPick={onPickDate}
        />
      )}
      <button
        type="button"
        className="button button-secondary cash-header-refresh"
        onClick={onRefresh}
      >
        <RefreshCw aria-hidden />
        <span className="cash-header-refresh-text">Atualizar</span>
      </button>
    </div>
  );
}
