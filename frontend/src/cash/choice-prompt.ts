import type { ItemPreview } from './item-preview';
import { choiceOptions, choiceSubject } from './line-choice';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

export type ChoicePreview = Extract<ItemPreview, { kind: 'choice' }>;

/**
 * A pergunta do pão para a linha (2026-11-08): as opções na ordem das teclas e a marcada pelas
 * setas. Null = a linha não existe mais, já tem a escolha ou o item não pede.
 *
 * @example choicePreview(menu, xSaladaArt, 0)?.options.length // 3
 */
export function choicePreview(
  menu: MenuItem[],
  line: DraftLine | undefined,
  active: number,
): ChoicePreview | null {
  if (!line || line.choice !== null) return null;
  const options = choiceOptions(menu, line);
  if (options.length === 0) return null;
  const index = Math.max(0, Math.min(active, options.length - 1));
  const subject = choiceSubject(options);
  return { kind: 'choice', line, options, active: index, subject };
}

/**
 * A linha que acabou de entrar no fim e pede a escolha: a pergunta abre na hora de lançar
 * (decisão do usuário, 2026-11-08). Undefined se nenhuma linha entrou ou ela não pede.
 *
 * @example lineToAsk(antes, depois, menu)?.name // 'X Salada'
 */
export function lineToAsk(
  before: DraftLine[],
  after: DraftLine[],
  menu: MenuItem[],
): DraftLine | undefined {
  if (after.length <= before.length) return undefined;
  const last = after.at(-1);
  if (!last || last.choice !== null) return undefined;
  return choiceOptions(menu, last).length > 0 ? last : undefined;
}

/**
 * O aviso quando falta a escolha ao seguir ou salvar.
 *
 * @example pendingChoiceMessage('o pão', 'X Salada') // 'Escolha o pão do X Salada antes de seguir'
 */
export function pendingChoiceMessage(subject: string, lineName: string): string {
  return `Escolha ${subject} do ${lineName} antes de seguir`;
}
