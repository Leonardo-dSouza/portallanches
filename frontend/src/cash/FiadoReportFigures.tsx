import { Fragment } from 'react';
import { formatMoney } from '../api/money';
import type { ClosingReport } from '../api/types';
import {
  fiadoOrderLabel,
  fiadoReceiptText,
  fiadoSoldText,
} from './fiado-labels';
import { Figure, FigureNote } from './PaymentFigures';

/**
 * Recebido de fiado na noite (2026-10-25): quem pagou o quê (2026-11-01). O dinheiro já está no
 * faturamento e nas formas do quadro Vendas; aqui é o detalhe de cada recebimento.
 */
export function FiadoReceivedFigures({ report }: { report: ClosingReport }) {
  const receipts = report.fiadoReceipts ?? [];
  if (receipts.length === 0) return null;
  return (
    <section className="report-section">
      <h2>Recebido de fiado</h2>
      <dl className="report">
        {receipts.map((receipt) => (
          <Fragment
            key={`${receipt.orderBusinessDate}-${receipt.orderDayNumber}-${receipt.received}`}
          >
            <Figure
              label={`${fiadoOrderLabel({ dayNumber: receipt.orderDayNumber, businessDate: receipt.orderBusinessDate })} · ${receipt.customerName ?? '—'}`}
              value={formatMoney(receipt.received)}
            />
            <FigureNote text={fiadoReceiptText(receipt)} />
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

/**
 * Fiado da noite (2026-11-01): o pedido foi feito nela e baixou o estoque, mas o dinheiro só
 * entra no faturamento da noite em que for pago. A situação é a de hoje.
 */
export function FiadoSoldFigures({ report }: { report: ClosingReport }) {
  const sold = report.fiadoSold ?? [];
  if (sold.length === 0) return null;
  return (
    <section className="report-section">
      <h2>Fiado da noite</h2>
      <dl className="report">
        {sold.map((line) => (
          <Fragment key={line.dayNumber}>
            <Figure
              label={`#${line.dayNumber} ${line.customerName ?? '—'}`}
              value={formatMoney(line.amount)}
            />
            <FigureNote text={fiadoSoldText(line)} />
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
