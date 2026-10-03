import { Check, Plus, X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { SupplyApi } from '../api/supply-api';
import type { SaleProduct, Supply, SupplySection } from '../api/types';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { COUNT_UNIT_SUGGESTIONS } from './supply-form-values';
import type { RowContext } from './use-row-action';
import { useSupplyForm, type SupplyFormState } from './use-supply-form';

interface SupplyFormProps {
  supplies: SupplyApi;
  editing: Supply | null;
  sections: SupplySection[];
  context: RowContext;
  onDone(): void;
}

const unitOf = (form: SupplyFormState) => form.values.countUnit.trim() || 'un';

function PackageRows({ form }: { form: SupplyFormState }) {
  const unit = unitOf(form);
  return (
    <fieldset className="package-rows">
      <legend>Embalagens de compra</legend>
      <p className="hint">
        Quantas unidades de contagem vêm em cada embalagem (ex.: caixa = 36).
      </p>
      {form.values.packages.map((row, index) => (
        <div className="package-row" key={index}>
          <TextField
            label={`Embalagem ${index + 1}`}
            placeholder="caixa, fardo…"
            value={row.name}
            onChange={(value) => form.setPackage(index, 'name', value)}
          />
          <TextField
            label={`Quantidade (${unit})`}
            inputMode="decimal"
            value={row.quantity}
            onChange={(value) => form.setPackage(index, 'quantity', value)}
          />
          <button
            type="button"
            className="button-ghost button-danger"
            aria-label={`Remover embalagem ${index + 1}`}
            onClick={() => form.removePackage(index)}
          >
            <X aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" className="button-ghost" onClick={form.addPackage}>
        <Plus aria-hidden />
        Adicionar embalagem
      </button>
    </fieldset>
  );
}

interface SupplyMainFieldsProps {
  form: SupplyFormState;
  sections: SupplySection[];
}

function SupplyMainFields({ form, sections }: SupplyMainFieldsProps) {
  return (
    <div className="supply-fields">
      <TextField
        label="Nome do insumo"
        value={form.values.name}
        onChange={(value) => form.setField('name', value)}
      />
      <SelectField
        label="Seção"
        emptyLabel="Sem seção"
        value={form.values.sectionId}
        options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
        onChange={(value) => form.setField('sectionId', value)}
      />
      <TextField
        label="Unidade de contagem"
        list="count-units"
        // Vem preenchido com "un": ao entrar no campo, digitar substitui em vez de somar.
        onFocus={(event) => event.target.select()}
        value={form.values.countUnit}
        onChange={(value) => form.setField('countUnit', value)}
      />
      <datalist id="count-units">
        {COUNT_UNIT_SUGGESTIONS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <TextField
        label="Estoque mínimo (opcional)"
        inputMode="decimal"
        value={form.values.minStock}
        onChange={(value) => form.setField('minStock', value)}
      />
      <TextField
        label={`Custo por ${unitOf(form)} (opcional)`}
        inputMode="decimal"
        value={form.values.unitCost}
        onChange={(value) => form.setField('unitCost', value)}
      />
    </div>
  );
}

interface SalePriceFieldProps {
  form: SupplyFormState;
  saleProduct: SaleProduct;
}

/**
 * Preço de venda do insumo vendido sozinho (bebida, adicional): é gravado no item do
 * Cardápio, que aparece no rótulo para não haver dúvida de onde ele vai parar.
 */
function SalePriceField({ form, saleProduct }: SalePriceFieldProps) {
  return (
    <div className="supply-sale-price">
      <TextField
        label={`Preço de venda (Cardápio: ${saleProduct.name})`}
        inputMode="decimal"
        value={form.values.salePrice}
        onChange={(value) => form.setField('salePrice', value)}
      />
      {saleProduct.importSource && (
        <p className="hint">
          Veio da planilha: reimportar a planilha sobrescreve este preço.
        </p>
      )}
    </div>
  );
}

function DeductOnSaleToggle({ form }: { form: SupplyFormState }) {
  return (
    <label className="catalog-toggle">
      <input
        type="checkbox"
        checked={form.values.deductOnSale}
        onChange={(event) => form.setDeductOnSale(event.target.checked)}
      />
      Baixa automática na venda (desmarque para o que só se controla na
      contagem, ex.: tomate)
    </label>
  );
}

/** Cadastro e edição de insumo: dados principais em linha e embalagens abaixo. */
export function SupplyForm(props: SupplyFormProps) {
  const form = useSupplyForm(props);
  const { editing, onDone } = props;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  return (
    <form className="card supply-form" onSubmit={submit}>
      <h2>{editing ? `Editar ${editing.name}` : 'Novo insumo'}</h2>
      <SupplyMainFields form={form} sections={props.sections} />
      {editing?.saleProduct && (
        <SalePriceField form={form} saleProduct={editing.saleProduct} />
      )}
      <DeductOnSaleToggle form={form} />
      <PackageRows form={form} />
      <div className="supply-form-actions">
        {editing && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onDone}
          >
            Cancelar edição
          </button>
        )}
        <button
          type="submit"
          className="button"
          disabled={form.busy}
          aria-busy={form.busy}
        >
          {editing ? <Check aria-hidden /> : <Plus aria-hidden />}
          {editing ? 'Salvar alterações' : 'Adicionar insumo'}
        </button>
      </div>
    </form>
  );
}
