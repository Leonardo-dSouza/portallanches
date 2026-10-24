import type { ReceiptModel } from './receipt-model';
import { TicketItems } from './TicketItems';

// Faixa invertida no topo: a chapa vê de longe que é a mesma comanda alterada (2026-10-15) ou
// que é a comida da equipe, sem cobrança nem embalagem de entrega (2026-10-23).
const ALERTS: Partial<Record<ReceiptModel['kind'], string>> = {
  changed: 'PEDIDO ALTERADO',
  staff: 'CONSUMO INTERNO',
};

function TicketHead({ receipt }: { receipt: ReceiptModel }) {
  const alert = ALERTS[receipt.kind];
  return (
    <>
      {alert && <p className="ticket-alert">{alert}</p>}
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
  const label = receipt.number || `do consumo de ${receipt.name}`;
  return (
    <article className="ticket" aria-label={`Comanda ${label}`}>
      <TicketHead receipt={receipt} />
      <section className="ticket-block">
        <TicketItems items={receipt.items} prices={receipt.showPrices} />
      </section>
      <TicketRemoved receipt={receipt} />
      <TicketFoot receipt={receipt} />
    </article>
  );
}
