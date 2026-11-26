import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

export type DialogCloseReason = 'escape' | 'backdrop' | 'button';

interface DialogProps {
  title: string;
  /** Callback para fechar (botão Fechar, Esc e clique fora); omitido em diálogos que bloqueiam a tela. */
  onClose?(reason: DialogCloseReason): void;
  children: ReactNode;
  /** Mais largo, para tabelas (os itens da nota fiscal). */
  wide?: boolean;
  /** Classe extra para um diálogo com largura própria (movimentações do estoque, 2026-11-08). */
  className?: string;
  /** Conteúdo antes do botão Fechar (ex.: total da linha em AddonDialog). */
  aside?: ReactNode;
  /** Devolve o foco ao elemento que abriu ao fechar (padrão true; false não devolve). */
  restoreFocus?: boolean;
}

function dialogClassName(wide?: boolean, extra?: string): string {
  return ['dialog', wide && 'dialog-wide', extra].filter(Boolean).join(' ');
}

function useDialogModal(
  ref: RefObject<HTMLDialogElement | null>,
  restoreFocus: boolean,
) {
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      dialog?.close();
      if (restoreFocus && opener instanceof HTMLElement) opener.focus();
    };
  }, [ref, restoreFocus]);
}

interface DialogHeadProps {
  title: string;
  titleId: string;
  aside?: ReactNode;
  onClose?(reason: DialogCloseReason): void;
}

function DialogHead({ title, titleId, aside, onClose }: DialogHeadProps) {
  return (
    <header className="dialog-head">
      <h2 id={titleId}>{title}</h2>
      {aside}
      {onClose && (
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label="Fechar"
          onClick={() => onClose('button')}
        >
          <X aria-hidden />
        </button>
      )}
    </header>
  );
}

/**
 * Pop-up modal com o `<dialog>` nativo (prende o foco e fecha no Esc). Ao fechar, o foco
 * volta para onde estava (a linha ou o botão que abriu). Ao abrir, o foco vai para o elemento
 * com `data-autofocus` (2026-10-16): o `autoFocus` do React acontece antes do `showModal()`, que
 * leva o foco para o 1º botão (o "Fechar").
 *
 * @example <Dialog title="Entrega para Ana" onClose={close}>…</Dialog>
 */
export function Dialog({
  title,
  onClose,
  children,
  wide,
  className,
  aside,
  restoreFocus = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useDialogModal(ref, restoreFocus);
  return (
    <dialog
      ref={ref}
      className={dialogClassName(wide, className)}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.('escape');
      }}
      // O jsdom não dispara `cancel` no Esc; aqui o Esc fecha igual. Quem já tratou o Esc
      // (preventDefault) fica com ele, como acontecia com o `cancel` nativo.
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        event.preventDefault();
        onClose?.('escape');
      }}
      onClick={(event) =>
        event.target === event.currentTarget && onClose?.('backdrop')
      }
    >
      <div className="dialog-body">
        <DialogHead
          title={title}
          titleId={titleId}
          aside={aside}
          onClose={onClose}
        />
        {children}
      </div>
    </dialog>
  );
}
