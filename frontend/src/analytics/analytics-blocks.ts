import {
  ChartColumn,
  CalendarDays,
  CreditCard,
  LayoutList,
  MapPin,
  ReceiptText,
  Trophy,
  Users,
} from 'lucide-react';
import type { SwitchOption } from '../components/SwitchRow';

export type AnalyticsBlockId =
  | 'fechamento'
  | 'noites'
  | 'produtos'
  | 'categorias'
  | 'bairros'
  | 'clientes'
  | 'semana'
  | 'pagamentos';

/** `day` = só na análise de um dia; `period` = só com várias noites; `any` = sempre. */
type BlockScope = 'day' | 'period' | 'any';

interface AnalyticsBlock extends SwitchOption<AnalyticsBlockId> {
  id: AnalyticsBlockId;
  scope: BlockScope;
}

const block = (
  id: AnalyticsBlockId,
  label: string,
  Icon: SwitchOption<AnalyticsBlockId>['Icon'],
  scope: BlockScope = 'any',
): AnalyticsBlock => ({ id, key: id, label, Icon, scope });

/** Os blocos na ordem da tela; o visor não entra (fica sempre). */
export const ANALYTICS_BLOCKS: readonly AnalyticsBlock[] = [
  block('fechamento', 'Fechamento do dia', ReceiptText, 'day'),
  block('noites', 'Noites', ChartColumn, 'period'),
  block('produtos', 'Mais vendidos', Trophy),
  block('categorias', 'Categorias', LayoutList),
  block('bairros', 'Bairros', MapPin),
  block('clientes', 'Clientes', Users),
  block('semana', 'Dias da semana', CalendarDays, 'period'),
  block('pagamentos', 'Pagamentos', CreditCard),
];

const STORAGE_KEY = 'portallanches.analise.blocos';
const KNOWN = new Set<string>(ANALYTICS_BLOCKS.map((b) => b.id));
const allBlocks = () => new Set(ANALYTICS_BLOCKS.map((b) => b.id));

/** O pedaço do `localStorage` que a escolha usa (injetável nos testes). */
export interface BlockStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Os blocos que se aplicam: o fechamento (pedidos, gastos e resumo) só num dia; as noites e
 * os dias da semana só com várias noites.
 */
export function blocksFor(singleDay: boolean): AnalyticsBlock[] {
  const hidden: BlockScope = singleDay ? 'period' : 'day';
  return ANALYTICS_BLOCKS.filter((b) => b.scope !== hidden);
}

function parseStored(raw: string): Set<AnalyticsBlockId> | null {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;
  const ids = parsed.filter((id): id is AnalyticsBlockId => KNOWN.has(id));
  return new Set(ids);
}

/**
 * Blocos ligados na última visita; sem escolha, escolha inválida ou navegador que recusa o
 * armazenamento, tudo ligado.
 *
 * @example readBlocks(window.localStorage).has('bairros') // true
 */
export function readBlocks(
  storage: BlockStorage | null,
): Set<AnalyticsBlockId> {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return (raw && parseStored(raw)) || allBlocks();
  } catch {
    return allBlocks();
  }
}

/** Guarda a escolha; se o navegador recusar, a tela segue funcionando sem lembrar. */
export function writeBlocks(
  storage: BlockStorage | null,
  shown: ReadonlySet<AnalyticsBlockId>,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify([...shown]));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a escolha vale só até sair da tela.
  }
}
