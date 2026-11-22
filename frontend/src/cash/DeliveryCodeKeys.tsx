import { Bike, Copy, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Order } from '../api/types';
import { useAppSettings } from '../settings/app-settings-context';
import { fillDeliveryMessage } from './delivery-message';
import { useTextExport } from './text-export-context';

interface CopyMessageKeyProps {
  label: string;
  Icon: LucideIcon;
  text: string;
  onCopied(copied: boolean): void;
}

/**
 * Uma tecla de copiar com a caixa de texto escondida ao lado: a produção roda em HTTP pelo IP,
 * sem `navigator.clipboard`, e o plano B seleciona a caixa. Ela fica dentro do pop-up porque,
 * com o `<dialog>` modal aberto, o que está fora dele não pode ser selecionado.
 */
function CopyMessageKey({ label, Icon, text, onCopied }: CopyMessageKeyProps) {
  const textExport = useTextExport();
  const source = useRef<HTMLTextAreaElement>(null);
  const key = useRef<HTMLButtonElement>(null);
  const copy = async () => {
    const copied = await textExport.copy(text, source.current);
    // O plano B leva o foco para a caixa escondida: devolve à tecla.
    key.current?.focus();
    onCopied(copied);
  };
  return (
    <>
      <button
        ref={key}
        type="button"
        className="button button-secondary"
        onClick={() => void copy()}
      >
        <Icon aria-hidden />
        {label}
      </button>
      <textarea
        ref={source}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        readOnly
        value={text}
      />
    </>
  );
}

function DeliveryCodePanel({ code }: { code: string }) {
  const settings = useAppSettings();
  const [status, setStatus] = useState<string | null>(null);
  const onCopied = (copied: boolean) =>
    setStatus(
      copied
        ? 'Mensagem copiada. Cole no WhatsApp do cliente.'
        : 'O navegador não deixou copiar: digite o código na mensagem à mão.',
    );
  return (
    <section className="delivery-code" aria-label="Código de entrega">
      <p className="delivery-code-head">
        Código de entrega
        <strong className="delivery-code-number">{code}</strong>
      </p>
      <div className="delivery-code-keys">
        <CopyMessageKey
          label="Copiar confirmação"
          Icon={Copy}
          text={fillDeliveryMessage(settings.deliveryCodeConfirmMessage, code)}
          onCopied={onCopied}
        />
        <CopyMessageKey
          label="Copiar saiu p/ entrega"
          Icon={Bike}
          text={fillDeliveryMessage(settings.deliveryCodeRouteMessage, code)}
          onCopied={onCopied}
        />
      </div>
      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}
    </section>
  );
}

/**
 * O código de entrega no pop-up do pedido (pedido do usuário, 2026-11-21): os 4 dígitos e as
 * duas mensagens para o caixa mandar ao cliente. Só no pedido com código e não cancelado.
 *
 * @example <DeliveryCodeKeys order={order} />
 */
export function DeliveryCodeKeys({ order }: { order: Order }) {
  if (!order.deliveryCode || order.canceledAt !== null) return null;
  return <DeliveryCodePanel code={order.deliveryCode} />;
}
