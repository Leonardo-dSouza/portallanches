import { Check } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { VendorSummary } from '../api/purchase-types';
import type { DateRange } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { useRangeData } from '../history/use-range-data';
import { formatCnpjRoot } from './invoice-format';
import { PeriodContent } from './PeriodContent';
import { usePurchaseApi } from './use-purchase-api';

/**
 * Compras → Mercados: o apelido que aparece no lugar da razão social ("SENDAS DISTRIBUIDORA
 * S/A" → "Assaí"), com as notas e o total do período.
 */
export function VendorsView({ range }: { range: DateRange | null }) {
  const purchases = usePurchaseApi();
  const state = useRangeData(purchases.vendors, range);
  return (
    <PeriodContent state={state} loadingLabel="Carregando os mercados…">
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            title="Nenhum mercado ainda"
            hint="O mercado aparece aqui na primeira nota lançada no Caixa."
          />
        ) : (
          <div className="card card-flush">
            <div className="table-scroll">
              <table className="table purchases-table">
                <thead>
                  <tr>
                    <th>Apelido</th>
                    <th>Razão social</th>
                    <th>CNPJ (raiz)</th>
                    <th className="num">Notas</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((vendor) => (
                    <VendorRow
                      key={vendor.id}
                      vendor={vendor}
                      onSaved={state.reload}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    </PeriodContent>
  );
}

function useNicknameEditor(vendor: VendorSummary, onSaved: () => void) {
  const purchases = usePurchaseApi();
  const [nickname, setNickname] = useState(vendor.nickname ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = nickname.trim() !== (vendor.nickname ?? '');
  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      await purchases.renameVendor(vendor.id, nickname.trim() || null);
      setError(null);
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };
  return { nickname, setNickname, saving, error, changed, save };
}

function VendorRow({
  vendor,
  onSaved,
}: {
  vendor: VendorSummary;
  onSaved(): void;
}) {
  const editor = useNicknameEditor(vendor, onSaved);
  const saveOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void editor.save();
  };
  return (
    <tr>
      <td>
        <div className="vendor-nickname">
          <input
            aria-label={`Apelido de ${vendor.legalName}`}
            placeholder="Como vocês chamam"
            maxLength={60}
            value={editor.nickname}
            onChange={(event) => editor.setNickname(event.target.value)}
            onKeyDown={saveOnEnter}
          />
          <button
            type="button"
            className="button button-secondary button-sm"
            aria-label={`Salvar apelido de ${vendor.legalName}`}
            disabled={!editor.changed || editor.saving}
            onClick={() => void editor.save()}
          >
            <Check aria-hidden />
            Salvar
          </button>
        </div>
        {editor.error && (
          <p className="form-error" role="alert">
            {editor.error}
          </p>
        )}
      </td>
      <td>{vendor.legalName}</td>
      <td className="purchases-date">{formatCnpjRoot(vendor.cnpjRoot)}</td>
      <td className="num">{vendor.invoiceCount}</td>
      <td className="num strong">{formatMoney(vendor.total)}</td>
    </tr>
  );
}
