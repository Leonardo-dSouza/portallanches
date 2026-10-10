import { ItemsTable } from '../cash/ItemsTable';
import type { ReceiptModel } from './receipt-model';

function TicketHead({ receipt }: { receipt: ReceiptModel }) {
  const kind =
    receipt.kind === 'addition'
      ? `${receipt.kindLabel}: ADIÇÃO`
      : receipt.kindLabel;
  return (
    <>
      <header className="ticket-head">
        <span className="ticket-number">{receipt.number}</span>
        <span>{receipt.time}</span>
      </header>
      <p className="ticket-kind">{kind}</p>
      {receipt.name && <p className="ticket-name">{receipt.name}</p>}
      {receipt.address.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

function TicketFoot({ receipt }: { receipt: ReceiptModel }) {
  if (receipt.totals.length === 0) return null;
  return (
    <section className="ticket-block">
      <dl className="ticket-totals">
        {receipt.totals.map((total) => (
          <div key={total.label}>
            <dt>{total.label}</dt>
            <dd>{total.value}</dd>
          </div>
        ))}
      </dl>
      {receipt.payment.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  );
}

/**
 * A comanda da térmica de 58 mm (2026-10-10): número e hora, tipo e nome, endereço da
 * entrega, itens em colunas (Qtd, Item, Unit., Total), totais e pagamento. Preto no branco;
 * o driver do Windows desenha como imagem, então os acentos saem.
 */
export function Ticket({ receipt }: { receipt: ReceiptModel }) {
  return (
    <article className="ticket" aria-label={`Comanda ${receipt.number}`}>
      <TicketHead receipt={receipt} />
      <section className="ticket-block">
        <ItemsTable rows={receipt.rows} />
      </section>
      <TicketFoot receipt={receipt} />
    </article>
  );
}
