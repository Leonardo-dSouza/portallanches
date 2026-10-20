import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  onClose(): void;
  children: ReactNode;
  /** Mais largo, para tabelas (os itens da nota fiscal). */
  wide?: boolean;
}

/**
 * Pop-up modal com o `<dialog>` nativo (prende o foco e fecha no Esc). Ao fechar, o foco
 * volta para onde estava (a linha ou o botão que abriu). Ao abrir, o foco vai para o elemento
 * com `data-autofocus` (2026-10-16): o `autoFocus` do React acontece antes do `showModal()`, que
 * leva o foco para o 1º botão (o "Fechar").
 *
 * @example <Dialog title="Entrega para Ana" onClose={close}>…</Dialog>
 */
export function Dialog({ title, onClose, children, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog dialog-wide' : 'dialog'}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Clique fora do conteúdo (no fundo escurecido) fecha.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="dialog-body">
        <header className="dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="button-ghost button-sm"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
