import {
  ChartColumn,
  CalendarDays,
  CreditCard,
  LayoutList,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import type { SwitchOption } from '../components/SwitchRow';

export type AnalyticsBlockId =
  | 'noites'
  | 'produtos'
  | 'categorias'
  | 'bairros'
  | 'clientes'
  | 'semana'
  | 'pagamentos';

interface AnalyticsBlock extends SwitchOption<AnalyticsBlockId> {
  id: AnalyticsBlockId;
  /** Só faz sentido com várias noites (some na análise de um dia). */
  severalNights: boolean;
}

const block = (
  id: AnalyticsBlockId,
  label: string,
  Icon: SwitchOption<AnalyticsBlockId>['Icon'],
  severalNights = false,
): AnalyticsBlock => ({ id, key: id, label, Icon, severalNights });

/** Os blocos na ordem da tela; o visor não entra (fica sempre). */
export const ANALYTICS_BLOCKS: readonly AnalyticsBlock[] = [
  block('noites', 'Noites', ChartColumn, true),
  block('produtos', 'Mais vendidos', Trophy),
  block('categorias', 'Categorias', LayoutList),
  block('bairros', 'Bairros', MapPin),
  block('clientes', 'Clientes', Users),
  block('semana', 'Dias da semana', CalendarDays, true),
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

/** Os blocos que se aplicam: com um dia só, as noites e os dias da semana não dizem nada. */
export function blocksFor(singleDay: boolean): AnalyticsBlock[] {
  return ANALYTICS_BLOCKS.filter((b) => !(singleDay && b.severalNights));
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
