import type { ReactNode } from 'react';
import type { ImportIssue, ImportResult } from '../api/import-api';
import { importSummaryText, toImportReport } from './import-report';

interface ReportListProps {
  title: string;
  tone: 'danger' | 'warning' | 'plain';
  items: ReactNode[];
  open?: boolean;
}

/** Uma seção do relatório; some quando não tem itens. */
function ReportList({ title, tone, items, open = false }: ReportListProps) {
  if (items.length === 0) return null;
  return (
    <details className="import-list" data-tone={tone} open={open}>
      <summary>
        {title} <span className="tab-count">{items.length}</span>
      </summary>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

const issueLine = (issue: ImportIssue) => (
  <>
    <code>{issue.where}</code> {issue.message}
  </>
);

const NOTHING_TO_SAVE =
  'Nada a gravar: o sistema já está igual a esta planilha (os avisos são só para conferir).';

const OUTCOME_TEXT: Record<ImportResult['outcome'], string> = {
  'dry-run':
    'Simulação: nada foi gravado ainda. Os avisos não impedem a gravação; só erros impedem.',
  blocked: 'A planilha tem erros: corrija e simule de novo. Nada foi gravado.',
  applied: 'Importação gravada.',
};

function outcomeText(result: ImportResult): string {
  const unchanged = result.outcome === 'dry-run' && result.changes.length === 0;
  return unchanged ? NOTHING_TO_SAVE : OUTCOME_TEXT[result.outcome];
}

interface ApplyButtonProps {
  deactivations: number;
  changes: number;
  busy: boolean;
  onApply(): void;
}

function ApplyButton({
  deactivations,
  changes,
  busy,
  onApply,
}: ApplyButtonProps) {
  const label =
    deactivations > 0
      ? `Gravar e desativar ${deactivations}`
      : `Gravar ${changes} mudanças`;
  return (
    <button
      type="button"
      className="button"
      disabled={busy}
      aria-busy={busy}
      onClick={onApply}
    >
      {label}
    </button>
  );
}

interface ImportReportProps {
  result: ImportResult;
  busy: boolean;
  onApply(): void;
}

/** Resultado da simulação ou da gravação: o mais grave primeiro (erros, desativações, avisos). */
export function ImportReport({ result, busy, onApply }: ImportReportProps) {
  const report = toImportReport(result);
  const done = result.outcome === 'applied';
  return (
    <section
      className="card import-report"
      aria-label="Resultado da importação"
    >
      <div
        className="import-outcome"
        data-outcome={result.outcome}
        role="status"
      >
        <p className="strong">{outcomeText(result)}</p>
        <p className="import-summary">{importSummaryText(result.summary)}</p>
      </div>
      <ReportList
        title="Erros"
        tone="danger"
        items={report.errors.map(issueLine)}
        open
      />
      <ReportList
        title={done ? 'Desativados' : 'Serão desativados'}
        tone="danger"
        items={report.deactivations}
        open
      />
      <ReportList
        title="Avisos"
        tone="warning"
        items={report.warnings.map(issueLine)}
        open
      />
      <ReportList title="Novos" tone="plain" items={report.additions} />
      <ReportList title="Alterados" tone="plain" items={report.updates} />
      {result.outcome === 'dry-run' && result.changes.length > 0 && (
        <ApplyButton
          deactivations={report.deactivations.length}
          changes={result.changes.length}
          busy={busy}
          onApply={onApply}
        />
      )}
    </section>
  );
}
