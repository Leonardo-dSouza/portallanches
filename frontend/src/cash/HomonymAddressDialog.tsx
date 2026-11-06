import { UserPen, UserPlus } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { Dialog } from '../components/Dialog';
import type { HomonymAnswer } from './homonym-address';
import type { HomonymQuestion } from './use-homonym-question';

// O caixa responde sem tirar a mão do teclado: 1 e 2, como as teclas de pagamento.
const ANSWER_KEYS: Record<string, HomonymAnswer> = { 1: 'same', 2: 'other' };

/**
 * S5-11 (2026-11-06): o cliente achado pelo nome vai com outro endereço. "Mudou de endereço"
 * atualiza o cadastro; "É outra pessoa" (no Enter, porque errar para esse lado só duplica o
 * cliente, e errar para o outro sobrescreve o cadastro de alguém) cadastra um novo.
 *
 * @example <HomonymAddressDialog question={form.homonym} />
 */
export function HomonymAddressDialog({
  question,
}: {
  question: HomonymQuestion;
}) {
  const { view } = question;
  if (!view) return null;
  const pressKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const answer = ANSWER_KEYS[event.key];
    if (!answer) return;
    event.preventDefault();
    event.stopPropagation();
    question.answer(answer);
  };
  return (
    <Dialog title={`${view.name} já está cadastrado`} onClose={question.cancel}>
      <div className="homonym-question" onKeyDown={pressKey}>
        <p>
          No cadastro: <strong>{view.recordAddress ?? 'sem endereço'}</strong>
        </p>
        <p>
          Neste pedido: <strong>{view.typedAddress}</strong>
        </p>
        <p className="hint">
          Outra pessoa vira um cadastro novo com o mesmo nome; o antigo fica
          como está.
        </p>
        <HomonymAnswerKeys question={question} />
      </div>
    </Dialog>
  );
}

function HomonymAnswerKeys({ question }: { question: HomonymQuestion }) {
  const sameLabel = question.view?.recordAddress
    ? 'Mudou de endereço'
    : 'Mesma pessoa';
  return (
    <div className="dialog-actions">
      <button
        type="button"
        className="button button-secondary"
        onClick={() => question.answer('same')}
      >
        <kbd aria-hidden className="kbd-hint">
          1
        </kbd>
        <UserPen aria-hidden />
        {sameLabel}
      </button>
      <button
        type="button"
        className="button"
        data-autofocus
        onClick={() => question.answer('other')}
      >
        <kbd aria-hidden className="kbd-hint">
          2
        </kbd>
        <UserPlus aria-hidden />É outra pessoa
      </button>
    </div>
  );
}
