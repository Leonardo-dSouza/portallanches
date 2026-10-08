import type { DayClosing } from '../api/day-closing-api';
import { ReportFigures } from '../cash/ReportFigures';
import { Skeleton } from '../components/Skeleton';
import { AnalyticsSection } from './AnalyticsSection';
import { DayExpensesList } from './DayExpensesList';
import { DayOrdersBoard } from './DayOrdersBoard';
import { useDayClosing } from './use-day-closing';

const STATUS_NOTE = {
  OPEN: 'Caixa aberto. Aqui é só consulta: para corrigir, use a tela do Caixa.',
  CLOSED:
    'Caixa fechado. Aqui é só consulta: para corrigir, reabra o dia pelo Histórico.',
} as const;

function DayClosingView({ day }: { day: DayClosing }) {
  return (
    <>
      <section
        className="analytics-day-summary"
        aria-label="Resumo do fechamento"
      >
        <ReportFigures report={day.report} />
      </section>
      <AnalyticsSection
        title="Pedidos do dia"
        note={STATUS_NOTE[day.report.status]}
        wide
      >
        <DayOrdersBoard day={day} />
      </AnalyticsSection>
      <AnalyticsSection title="Gastos do dia">
        <DayExpensesList day={day} />
      </AnalyticsSection>
    </>
  );
}

/**
 * O caixa de um dia só para ler (pedidos de cada cliente, taxas, gastos e o resumo): ver um
 * dia fechado sem reabrir, para não apagar nada sem querer (pedido do usuário, 2026-10-08).
 */
export function DayClosingSections({ date }: { date: string }) {
  const state = useDayClosing(date);
  if (state.kind === 'ready') return <DayClosingView day={state.day} />;
  return (
    <AnalyticsSection title="Fechamento do dia" wide>
      {state.kind === 'loading' && (
        <Skeleton label="Carregando o caixa do dia…" rows={3} />
      )}
      {state.kind === 'missing' && (
        <p className="analytics-empty">Nenhum caixa nesse dia.</p>
      )}
      {state.kind === 'failed' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
    </AnalyticsSection>
  );
}
