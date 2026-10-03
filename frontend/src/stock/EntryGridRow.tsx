import type { PaidPer, Supply } from '../api/types';
import { entryPreview, type EntryRowValues } from './entry-form-values';

interface EntryGridRowProps {
  supply: Supply;
  row: EntryRowValues;
  onChange(row: EntryRowValues): void;
}

/** Unidade em que a quantidade foi digitada: a embalagem escolhida ou a de contagem. */
const typedUnit = (supply: Supply, row: EntryRowValues): string =>
  row.packageName || supply.countUnit;

function UnitSelect({ supply, row, onChange }: EntryGridRowProps) {
  if (supply.packages.length === 0)
    return <span className="muted-cell">{supply.countUnit}</span>;
  return (
    <select
      className="cell-input entry-unit"
      aria-label={`Unidade de ${supply.name}`}
      value={row.packageName}
      onChange={(event) =>
        onChange({ ...row, packageName: event.target.value })
      }
    >
      <option value="">{supply.countUnit}</option>
      {supply.packages.map((p) => (
        <option key={p.name} value={p.name}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

function PaidCell({ supply, row, onChange }: EntryGridRowProps) {
  return (
    <div className="entry-paid">
      <input
        className="cell-input cell-input-short"
        inputMode="decimal"
        placeholder="R$"
        aria-label={`Valor pago por ${supply.name}`}
        value={row.paid}
        onChange={(event) => onChange({ ...row, paid: event.target.value })}
      />
      <select
        className="cell-input entry-unit"
        aria-label={`Valor pago de ${supply.name} é`}
        value={row.paidPer}
        onChange={(event) =>
          onChange({ ...row, paidPer: event.target.value as PaidPer })
        }
      >
        <option value="total">total</option>
        <option value="unit">por {typedUnit(supply, row)}</option>
      </select>
    </div>
  );
}

/**
 * Uma linha da compra: quantidade, unidade, validade e valor pago de um insumo, com quanto
 * ela soma no estoque. Linha em branco fica fora da compra.
 */
export function EntryGridRow(props: EntryGridRowProps) {
  const { supply, row, onChange } = props;
  const preview = row.amount.trim() ? entryPreview(row, supply) : null;
  return (
    <tr data-filled={preview !== null}>
      <td className="strong">{supply.name}</td>
      <td>
        <input
          className="cell-input cell-input-short"
          inputMode="decimal"
          aria-label={`Quantidade de ${supply.name}`}
          value={row.amount}
          onChange={(event) => onChange({ ...row, amount: event.target.value })}
        />
      </td>
      <td>
        <UnitSelect {...props} />
      </td>
      <td>
        <input
          className="cell-input entry-date"
          type="date"
          aria-label={`Validade de ${supply.name}`}
          value={row.expiresOn}
          onChange={(event) =>
            onChange({ ...row, expiresOn: event.target.value })
          }
        />
      </td>
      <td>
        <PaidCell {...props} />
      </td>
      <td className="num muted-cell">{preview ? `+ ${preview}` : '—'}</td>
    </tr>
  );
}
