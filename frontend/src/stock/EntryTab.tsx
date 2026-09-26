import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { StockApi } from '../api/stock-api';
import type { Supply } from '../api/types';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import {
  buildEntryInput,
  EMPTY_ENTRY_FORM,
  entryPreview,
  type EntryFormValues,
} from './entry-form-values';

interface EntryTabProps {
  stock: StockApi;
  supplies: Supply[];
  onSaved(): void;
}

function useEntryForm({ stock, supplies, onSaved }: EntryTabProps) {
  const [values, setValues] = useState(EMPTY_ENTRY_FORM);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const supply = supplies.find((s) => String(s.id) === values.supplyId);
  const preview = entryPreview(values, supply);
  const setField = (field: keyof EntryFormValues, value: string) =>
    setValues((current) =>
      // Trocar o insumo zera a embalagem: a do insumo anterior pode não existir no novo.
      field === 'supplyId'
        ? { ...current, supplyId: value, packageName: '' }
        : { ...current, [field]: value },
    );
  const submit = async () => {
    const built = buildEntryInput(values);
    if (!built.ok) return setMessage({ ok: false, text: built.error });
    setSaving(true);
    try {
      await stock.addEntry(built.value);
      setMessage({
        ok: true,
        text: `Entrada lançada: ${preview} de ${supply?.name}.`,
      });
      setValues({ ...EMPTY_ENTRY_FORM, supplyId: values.supplyId });
      onSaved();
    } catch (failure) {
      setMessage({ ok: false, text: errorMessage(failure) });
    } finally {
      setSaving(false);
    }
  };
  return { values, supply, preview, message, saving, setField, submit };
}

/** Lança um lote: quantidade em unidade de contagem ou em embalagens, com validade opcional. */
export function EntryTab(props: EntryTabProps) {
  const form = useEntryForm(props);
  const { values, supply } = form;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  const unitOptions = supply
    ? [
        { value: '', label: supply.countUnit },
        ...supply.packages.map((p) => ({ value: p.name, label: p.name })),
      ]
    : [];
  return (
    <form className="card entry-form" onSubmit={handleSubmit}>
      <h2>Entrada de estoque</h2>
      <p className="hint">
        Cada entrada vira um lote com a sua validade: dois fardos com validades
        diferentes são duas entradas.
      </p>
      <SelectField
        label="Insumo"
        value={values.supplyId}
        options={props.supplies.map((s) => ({
          value: String(s.id),
          label: s.name,
        }))}
        onChange={(value) => form.setField('supplyId', value)}
      />
      <div className="field-pair entry-amount">
        <TextField
          label="Quantidade"
          inputMode="decimal"
          value={values.amount}
          onChange={(value) => form.setField('amount', value)}
        />
        <label className="field">
          Em
          {/* Sem "Selecione…": o padrão (vazio) é a própria unidade de contagem. */}
          <select
            value={values.packageName}
            disabled={!supply}
            onChange={(event) =>
              form.setField('packageName', event.target.value)
            }
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TextField
        label="Validade (opcional)"
        type="date"
        value={values.expiresOn}
        onChange={(value) => form.setField('expiresOn', value)}
      />
      {form.preview && values.packageName && (
        <p className="hint">Soma {form.preview} ao estoque.</p>
      )}
      {form.message && (
        <p
          className={form.message.ok ? 'form-success' : 'form-error'}
          role="status"
        >
          {form.message.text}
        </p>
      )}
      <button
        className="button"
        type="submit"
        disabled={form.saving}
        aria-busy={form.saving}
      >
        <Plus aria-hidden />
        Lançar entrada
      </button>
    </form>
  );
}
