import { Dialog } from '../components/Dialog';
import { formatMoney } from '../api/money';
import type { ProductImpact, SupplyCostChange } from '../api/cost-types';
import type { CostDraft } from './use-cost-draft';

export interface SaveCostsDialogProps {
  draft: CostDraft;
  onClose(): void;
}

function toScale4(val: string): bigint {
  const [intPart, decPart = ''] = val.split('.');
  return BigInt(intPart) * 10000n + BigInt(decPart.padEnd(4, '0').slice(0, 4));
}

function formatVariation(before: string | null, after: string | null): string {
  if (!before || !after) return '—';
  const b = toScale4(before);
  const a = toScale4(after);
  if (b <= 0n) return '—';
  const diff = a - b;
  const sign = diff >= 0n ? '+' : '-';
  const absDiff = diff >= 0n ? diff : -diff;
  const roundedTenths = (absDiff * 1000n + b / 2n) / b;
  const intPart = roundedTenths / 10n;
  const decPart = roundedTenths % 10n;
  return `${sign}${intPart},${decPart}%`;
}

function formatPercent(val: string | null): string {
  return val ? `${val.replace('.', ',')}%` : '—';
}

function formatDecimal(val: string | null): string {
  return val ? val.replace('.', ',') : '—';
}

interface StatsProps {
  basePrices: number;
  recipes: number;
  products: number;
  becameBelowTarget: number;
}

function SummaryStats(props: StatsProps) {
  return (
    <div className="summary-grid">
      <div className="stat-card">
        <span className="stat-label">Preços base mudados</span>
        <strong className="stat-value">{props.basePrices}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">Fichas de produção</span>
        <strong className="stat-value">{props.recipes}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">Lanches com CMV novo</span>
        <strong className="stat-value">{props.products}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">Passam a lucrar menos que a meta</span>
        <strong className="stat-value">{props.becameBelowTarget}</strong>
      </div>
    </div>
  );
}

function SuppliesTable({ supplies }: { supplies: SupplyCostChange[] }) {
  if (supplies.length === 0) return null;
  return (
    <div className="cost-section">
      <h3>O que você mudou</h3>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th className="num">Antes</th>
              <th className="num">Depois</th>
              <th className="num">Variação</th>
            </tr>
          </thead>
          <tbody>
            {supplies.map((s) => (
              <tr key={s.supplyId}>
                <td>{s.name}</td>
                <td className="num">{formatDecimal(s.before)}</td>
                <td className="num strong">{formatDecimal(s.after)}</td>
                <td className="num">{formatVariation(s.before, s.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTable({ products }: { products: ProductImpact[] }) {
  if (products.length === 0) return null;
  return (
    <div className="cost-section">
      <h3>Lanches que mudam</h3>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Lanche</th>
              <th className="num">CMV</th>
              <th className="num">CMV %</th>
              <th className="num">Preço</th>
              <th className="num">PV</th>
            </tr>
          </thead>
          <tbody>
            {products.map(({ before, after }) => {
              const dropsBelow = !before.belowTarget && after.belowTarget;
              return (
                <tr key={after.id}>
                  <td>
                    {after.name}
                    {dropsBelow && (
                      <span className="tag tag-danger ml-2">
                        lucro passa a &lt; meta
                      </span>
                    )}
                  </td>
                  <td className="num">
                    {formatMoney(before.cmv)} →{' '}
                    <strong>{formatMoney(after.cmv)}</strong>
                  </td>
                  <td className="num">
                    {formatPercent(before.cmvPercent)} →{' '}
                    {formatPercent(after.cmvPercent)}
                  </td>
                  <td className="num">
                    {after.salePrice ? formatMoney(after.salePrice) : '—'}
                  </td>
                  <td className="num">
                    {before.pv ? formatMoney(before.pv) : '—'} →{' '}
                    {after.pv ? formatMoney(after.pv) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function countAffectedRecipes(draft: CostDraft): number {
  const recipeSupplyIds = new Set(
    draft.sheet?.snapshot.recipes.map((r) => r.supplyId) ?? [],
  );
  const affectedInsumos =
    draft.preview?.impact.supplies.filter((s) =>
      recipeSupplyIds.has(s.supplyId),
    ) ?? [];
  const recipeIds = new Set([
    ...draft.changes.recipes.map((r) => r.supplyId),
    ...draft.changes.removedRecipeSupplyIds,
    ...affectedInsumos.map((s) => s.supplyId),
  ]);
  return recipeIds.size;
}

/**
 * Diálogo modal para conferência de impacto e confirmação do salvamento do rascunho de custos.
 *
 * @example <SaveCostsDialog draft={draft} onClose={closeDialog} />
 */
export function SaveCostsDialog({ draft, onClose }: SaveCostsDialogProps) {
  const supplies = draft.preview?.impact.supplies ?? [];
  const products = draft.preview?.impact.products ?? [];
  const becameBelowTarget = draft.preview?.impact.becameBelowTarget ?? 0;
  const recipeCount = countAffectedRecipes(draft);

  const handleSave = async () => {
    await draft.save();
    onClose();
  };

  const handleReload = async () => {
    await draft.reload();
    onClose();
  };

  return (
    <Dialog
      title="Salvar alterações?"
      onClose={onClose}
      wide
      className="save-costs-dialog"
    >
      <p className="hint">
        Confira o efeito antes de valer. Pedidos já lançados não mudam: eles
        guardam o CMV da hora.
      </p>
      {draft.conflict && (
        <div className="form-error">
          <p>
            Os custos mudaram em outro aparelho. Recarregue para ver o que está
            valendo.
          </p>
          <button type="button" className="button mt-2" onClick={handleReload}>
            Recarregar
          </button>
        </div>
      )}
      {draft.error && <p className="form-error">{draft.error}</p>}
      <SummaryStats
        basePrices={draft.changes.basePrices.length}
        recipes={recipeCount}
        products={products.length}
        becameBelowTarget={becameBelowTarget}
      />
      <SuppliesTable supplies={supplies} />
      <ProductsTable products={products} />
      <footer className="dialog-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          Voltar ao rascunho
        </button>
        {!draft.conflict && (
          <button
            type="button"
            className="button"
            disabled={draft.saving}
            aria-busy={draft.saving}
            onClick={handleSave}
          >
            Salvar alterações
          </button>
        )}
      </footer>
    </Dialog>
  );
}
