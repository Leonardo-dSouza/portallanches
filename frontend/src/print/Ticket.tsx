import type { ReceiptModel } from './receipt-model';
import { TicketItems } from './TicketItems';

function TicketHead({ receipt }: { receipt: ReceiptModel }) {
  const changed = receipt.kind === 'changed';
  return (
    <>
      {/* Edição que mexeu nos itens (2026-10-15): a chapa vê de longe que é a mesma comanda. */}
      {changed && <p className="ticket-alert">PEDIDO ALTERADO</p>}
      <header className="ticket-head">
        <span className="ticket-number">{receipt.number}</span>
        <span>{receipt.time}</span>
      </header>
      <p className="ticket-kind">{receipt.kindLabel}</p>
      {receipt.name && <p className="ticket-name">{receipt.name}</p>}
      {receipt.address.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

/** O que saiu na edição, riscado no fim dos itens: a chapa não faz. */
function TicketRemoved({ receipt }: { receipt: ReceiptModel }) {
  if (receipt.removed.length === 0) return null;
  return (
    <section className="ticket-block ticket-removed">
      {receipt.removed.map((item) => (
        <p key={item.key}>SAIU: {item.title}</p>
      ))}
    </section>
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
 * entrega, itens (o lanche em duas linhas desde 2026-10-11, ver `TicketItems`), totais e
 * pagamento. Preto no branco; o driver do Windows desenha como imagem, então os acentos saem.
 */
export function Ticket({ receipt }: { receipt: ReceiptModel }) {
  return (
    <article className="ticket" aria-label={`Comanda ${receipt.number}`}>
      <TicketHead receipt={receipt} />
      <section className="ticket-block">
        <TicketItems items={receipt.items} />
      </section>
      <TicketRemoved receipt={receipt} />
      <TicketFoot receipt={receipt} />
    </article>
  );
}
