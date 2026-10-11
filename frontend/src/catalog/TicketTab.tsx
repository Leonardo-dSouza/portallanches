import { Check } from 'lucide-react';
import type { ProductApi } from '../api/product-api';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';
import { TextField } from '../components/TextField';
import { AbbreviationRows } from './AbbreviationRows';
import { PaperPreview } from './PaperPreview';
import { useTicketForm } from './use-ticket-form';
import { useTicketLoad } from './use-ticket-load';

interface TicketFormProps {
  settings: SettingsApi;
  stored: AppSettings;
  menuNames: string[];
}

function TicketForm({ settings, stored, menuNames }: TicketFormProps) {
  const form = useTicketForm(settings, stored);
  return (
    <div className="ticket-settings">
      <form className="card ticket-settings-form" onSubmit={form.submit}>
        <TextField
          label="Marca do artesanal"
          maxLength={12}
          value={form.mark}
          onChange={form.setMark}
        />
        <p className="hint">
          Vai depois do nome do artesanal, na tela e na comanda: “X Salada{' '}
          {form.mark.trim() || '…'}”.
        </p>
        <AbbreviationRows form={form} />
        <button
          type="submit"
          className="button"
          disabled={form.busy}
          aria-busy={form.busy}
        >
          <Check aria-hidden />
          Salvar comanda
        </button>
        {form.message && (
          <p className="hint" role="status">
            {form.message}
          </p>
        )}
      </form>
      <PaperPreview menuNames={menuNames} rows={form.rows} />
    </div>
  );
}

/**
 * Cadastros → Comanda (pedido do usuário, 2026-10-11): a marca do artesanal, que antes era o
 * "(art.)" fixo no código, e as abreviações da comanda impressa.
 */
export function TicketTab({
  settings,
  products,
}: {
  settings: SettingsApi;
  products: ProductApi;
}) {
  const { stored, menuNames, error } = useTicketLoad(settings, products);
  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!stored) return <p className="hint">Carregando…</p>;
  return (
    <TicketForm settings={settings} stored={stored} menuNames={menuNames} />
  );
}
