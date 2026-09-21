import { useState } from 'react';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import type { DayGroup } from '../api/types';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { parseEffectiveFrom, parseRateAmount } from './catalog-values';
import { GROUP_OPTIONS } from './rates-view';
import { NewEntryForm } from './NewEntryForm';
import { useRowAction, type RowContext } from './use-row-action';

interface NewRateFormProps {
  admin: CatalogAdminApi;
  context: RowContext;
  /** Data sugerida em "Vale a partir de" (hoje, `AAAA-MM-DD`). */
  today: string;
}

/** Cadastra ou corrige uma diária: mesmo grupo e mesma data trocam o valor daquela linha. */
export function NewRateForm({ admin, context, today }: NewRateFormProps) {
  const [group, setGroup] = useState('');
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(today);
  const { busy, run } = useRowAction(context);
  const submit = async () => {
    const parsedAmount = parseRateAmount(amount);
    const parsedFrom = parseEffectiveFrom(from);
    if (group === '')
      return context.onError('Escolha o grupo de dias da diária');
    if (!parsedAmount.ok) return context.onError(parsedAmount.error);
    if (!parsedFrom.ok) return context.onError(parsedFrom.error);
    const saved = await run(() =>
      admin.saveMotoboyRate({
        dayGroup: group as DayGroup,
        amount: parsedAmount.value,
        effectiveFrom: parsedFrom.value,
      }),
    );
    if (saved) setAmount('');
  };
  return (
    <NewEntryForm
      title="Nova diária"
      submitLabel="Salvar diária"
      busy={busy}
      onSubmit={() => void submit()}
    >
      <SelectField
        label="Dias"
        value={group}
        options={GROUP_OPTIONS}
        onChange={setGroup}
      />
      <TextField
        label="Valor da diária"
        inputMode="decimal"
        value={amount}
        onChange={setAmount}
      />
      <TextField
        label="Vale a partir de"
        type="date"
        value={from}
        onChange={setFrom}
      />
    </NewEntryForm>
  );
}
