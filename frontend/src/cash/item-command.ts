/**
 * O que o caixa digitou no campo "Item" da comanda. Pensado para o bloco numérico: o ponto (ou
 * a vírgula) marca o artesanal e o `*` a quantidade, sem tirar a mão do bloco.
 */
export type ItemCommand =
  | { kind: 'empty' }
  | { kind: 'adjust'; delta: 1 | -1 }
  | { kind: 'number'; number: number; artisanal: boolean; quantity: number }
  | { kind: 'search'; query: string; quantity: number }
  | { kind: 'invalid'; error: string };

const MAX_QUANTITY = 99;
const NUMBER_COMMAND = /^(?:(\d{1,3})\s*[*x×]\s*)?(\d{1,3})\s*([.,])?$/i;
const QUANTITY_PREFIX = /^(\d{1,3})\s*[*x×]\s*(.*)$/i;
const HAS_LETTER = /\p{L}/u;

const FORMAT_HINT =
  'esperado número (9), artesanal com ponto (9.), quantidade com * (2*9) ou parte do nome (coca)';

const invalid = (text: string): ItemCommand => ({
  kind: 'invalid',
  error: `Não entendi "${text}": ${FORMAT_HINT}`,
});

function quantityOf(raw: string | undefined): number | null {
  const quantity = raw === undefined ? 1 : Number(raw);
  return quantity >= 1 && quantity <= MAX_QUANTITY ? quantity : null;
}

function numberCommand(text: string, match: RegExpMatchArray): ItemCommand {
  const quantity = quantityOf(match[1]);
  if (quantity === null) return invalid(text);
  const number = Number(match[2]);
  return {
    kind: 'number',
    number,
    artisanal: match[3] !== undefined,
    quantity,
  };
}

function searchCommand(text: string): ItemCommand {
  const prefixed = QUANTITY_PREFIX.exec(text);
  const query = (prefixed ? prefixed[2] : text).trim();
  const quantity = quantityOf(prefixed?.[1]);
  if (quantity === null || !HAS_LETTER.test(query)) return invalid(text);
  return { kind: 'search', query, quantity };
}

/**
 * Lê o campo "Item": vazio segue para o pagamento, `+`/`-` mexem na última linha.
 *
 * @example parseItemCommand('2*9.') // { kind: 'number', number: 9, artisanal: true, quantity: 2 }
 */
export function parseItemCommand(typed: string): ItemCommand {
  const text = typed.trim();
  if (!text) return { kind: 'empty' };
  if (text === '+' || text === '-')
    return { kind: 'adjust', delta: text === '+' ? 1 : -1 };
  const match = NUMBER_COMMAND.exec(text);
  if (match) return numberCommand(text, match);
  return searchCommand(text);
}
