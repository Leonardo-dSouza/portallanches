/**
 * O que o caixa digitou no campo "Item" da comanda. Pensado para o bloco numérico: o ponto (ou
 * a vírgula) marca o artesanal e o `*` a quantidade, sem tirar a mão do bloco.
 */
export type ItemCommand =
  | { kind: 'empty' }
  | { kind: 'adjust'; delta: 1 | -1 }
  | { kind: 'number'; number: number; artisanal: boolean; quantity: number }
  | { kind: 'search'; query: string; quantity: number }
  /** "+bacon": adicional na última linha. */
  | { kind: 'addon'; query: string }
  /** "/sem tomate": observação da última linha ('' limpa). */
  | { kind: 'note'; note: string }
  | { kind: 'invalid'; error: string };

const MAX_QUANTITY = 99;
const NUMBER_COMMAND = /^(?:(\d{1,3})\s*[*x×]\s*)?(\d{1,3})\s*([.,])?$/i;
const QUANTITY_PREFIX = /^(\d{1,3})\s*[*x×]\s*(.*)$/i;
const HAS_LETTER = /\p{L}/u;
const MAX_NOTE_LENGTH = 120;

const FORMAT_HINT =
  'esperado número (9), artesanal com ponto (9.), quantidade com * (2*9), parte do nome (coca), adicional (+bacon) ou observação (/sem tomate)';

const invalid = (text: string): ItemCommand => ({
  kind: 'invalid',
  error: `Não entendi "${text}": ${FORMAT_HINT}`,
});

/** Sem "2*" no Item, vale a quantidade do campo Qtd (`fallback`). */
function quantityOf(raw: string | undefined, fallback: number): number | null {
  const quantity = raw === undefined ? fallback : Number(raw);
  return quantity >= 1 && quantity <= MAX_QUANTITY ? quantity : null;
}

function numberCommand(
  text: string,
  match: RegExpMatchArray,
  fallback: number,
): ItemCommand {
  const quantity = quantityOf(match[1], fallback);
  if (quantity === null) return invalid(text);
  const number = Number(match[2]);
  return {
    kind: 'number',
    number,
    artisanal: match[3] !== undefined,
    quantity,
  };
}

function searchCommand(text: string, fallback: number): ItemCommand {
  const prefixed = QUANTITY_PREFIX.exec(text);
  const query = (prefixed ? prefixed[2] : text).trim();
  const quantity = quantityOf(prefixed?.[1], fallback);
  if (quantity === null || !HAS_LETTER.test(query)) return invalid(text);
  return { kind: 'search', query, quantity };
}

/** "+texto" (adicional) e "/texto" (observação) agem na última linha da comanda. */
function lineCommand(text: string): ItemCommand | null {
  if (text.startsWith('/')) {
    const note = text.slice(1).trim();
    return note.length <= MAX_NOTE_LENGTH
      ? { kind: 'note', note }
      : invalid(text);
  }
  if (!text.startsWith('+')) return null;
  const query = text.slice(1).trim();
  return HAS_LETTER.test(query) ? { kind: 'addon', query } : invalid(text);
}

/**
 * Lê o campo "Item": vazio segue para o pagamento, `+`/`-` mexem na última linha, "+bacon"
 * põe adicional e "/sem tomate" a observação na última linha. `quantity` é a do campo Qtd
 * (2026-10-10), que vale quando o Item não traz "2*".
 *
 * @example parseItemCommand('2*9.') // { kind: 'number', number: 9, artisanal: true, quantity: 2 }
 * @example parseItemCommand('9', 3) // { kind: 'number', number: 9, artisanal: false, quantity: 3 }
 */
export function parseItemCommand(typed: string, quantity = 1): ItemCommand {
  const text = typed.trim();
  if (!text) return { kind: 'empty' };
  if (text === '+' || text === '-')
    return { kind: 'adjust', delta: text === '+' ? 1 : -1 };
  const onLine = lineCommand(text);
  if (onLine) return onLine;
  const match = NUMBER_COMMAND.exec(text);
  if (match) return numberCommand(text, match, quantity);
  return searchCommand(text, quantity);
}
