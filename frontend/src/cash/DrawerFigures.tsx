import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { formatMoney } from '../api/money';
import type {
  ClosingStatus,
  DrawerCheckLine,
  DrawerReport,
} from '../api/types';
import { Figure } from './PaymentFigures';
import {
  drawerCountedByText,
  drawerLineResultText,
} from './drawer-figures-text';

interface DrawerFiguresProps {
  drawer: DrawerReport;
  status: ClosingStatus;
  action?: ReactNode;
}

/** Uma linha por forma conferida: nome, esperado, contado e o veredito. */
function DrawerCheckRow({ line }: { line: DrawerCheckLine }) {
  // Sobra e falta fora da tolerância se destacam; o MATCH com centavos de diferença não.
  const ddClass =
    line.verdict === 'MATCH' ? 'report-nested' : 'report-nested drawer-off';
  return (
    <Fragment>
      <dt className="report-nested">
        {line.name} · Esperado {formatMoney(line.expected)} · Contado{' '}
        {formatMoney(line.counted)}
      </dt>
      <dd className={ddClass}>
        {drawerLineResultText(line.verdict, line.difference)}
      </dd>
    </Fragment>
  );
}

/** Detalhe da conferência gravada: linhas por forma, operador, hora e nota. */
function DrawerCheckDetails({
  check,
}: {
  check: NonNullable<DrawerReport['check']>;
}) {
  return (
    <>
      <dl className="report report-sub">
        {check.lines.map((line) => (
          <DrawerCheckRow key={line.paymentMethodId} line={line} />
        ))}
      </dl>
      <p className="hint">
        {drawerCountedByText(check.countedBy, check.countedAt)}
      </p>
      {check.note && <p className="hint">{check.note}</p>}
    </>
  );
}

/** Mensagem quando a conferência ainda não foi gravada ou não houve. */
function DrawerCheckEmpty({ status }: { status: ClosingStatus }) {
  const text =
    status === 'CLOSED'
      ? 'Sem conferência'
      : 'A conferência aparece depois de fechar o dia.';
  return <p className="hint">{text}</p>;
}

/**
 * Quadro Conferência (card 7, 2026-11-12): troco inicial, linhas por forma conferida
 * com o veredito, operador e hora.
 *
 * @example <DrawerFigures drawer={report.drawer} status={report.status} />
 */
export function DrawerFigures({ drawer, status, action }: DrawerFiguresProps) {
  const { openingCash, check } = drawer;
  const openingLabel =
    openingCash !== null ? formatMoney(openingCash) : 'Não informado';
  return (
    <section className="report-section">
      <h2>Conferência</h2>
      <dl className="report">
        <Figure label="Troco inicial" value={openingLabel} />
      </dl>
      {check ? (
        <DrawerCheckDetails check={check} />
      ) : (
        <DrawerCheckEmpty status={status} />
      )}
      {action}
    </section>
  );
}
