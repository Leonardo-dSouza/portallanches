import type { ImportApi, ImportKind } from '../api/import-api';
import { readFileAsBase64, type FileReaderFn } from './file-base64';
import { ImportReport } from './ImportReport';
import { useSpreadsheetImport } from './use-spreadsheet-import';

const KINDS: { id: ImportKind; label: string; hint: string }[] = [
  {
    id: 'cardapio',
    label: 'Cardápio',
    hint: 'Planilha de custos (plan_custo_*.xlsm): insumos, lanches tradicionais, artesanais e adicionais.',
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    hint: 'Planilha de bebidas (Bebidas.xlsx): refrigerantes, cervejas e retornáveis.',
  },
];

interface KindChoiceProps {
  kind: ImportKind;
  onChoose(kind: ImportKind): void;
}

function KindChoice({ kind, onChoose }: KindChoiceProps) {
  return (
    <fieldset className="choice choice-row" aria-label="Planilha">
      {KINDS.map(({ id, label }) => (
        <label key={id}>
          <input
            type="radio"
            name="import-kind"
            checked={kind === id}
            onChange={() => onChoose(id)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

interface ImportsTabProps {
  imports: ImportApi;
  /** Só os testes trocam; no navegador lê o arquivo com `FileReader`. */
  readFile?: FileReaderFn;
}

/** Importação de planilhas: escolhe a planilha e o arquivo, simula, confere os avisos e grava. */
export function ImportsTab({
  imports,
  readFile = readFileAsBase64,
}: ImportsTabProps) {
  const flow = useSpreadsheetImport(imports, readFile);
  const hint = KINDS.find((k) => k.id === flow.kind)?.hint;
  return (
    <div className="import-tab">
      <section className="card import-form" aria-label="Importar planilha">
        <h2>Importar planilha</h2>
        <KindChoice kind={flow.kind} onChoose={flow.chooseKind} />
        <p className="hint">{hint}</p>
        <label className="field">
          <span>Arquivo da planilha</span>
          <input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(event) =>
              flow.chooseFile(event.target.files?.[0] ?? null)
            }
          />
        </label>
        <p className="hint">
          A simulação não grava nada. Ao gravar, a planilha vence: preço, custo
          e composição são atualizados, e itens desta planilha que sumiram dela
          são desativados. O preço novo vale a partir de hoje: um caixa de dia
          anterior lançado depois continua com o preço antigo.
        </p>
        <button
          type="button"
          className="button button-secondary"
          disabled={!flow.file || flow.busy}
          aria-busy={flow.busy}
          onClick={flow.simulate}
        >
          Simular importação
        </button>
        {flow.error && (
          <p className="form-error" role="alert">
            {flow.error}
          </p>
        )}
      </section>
      {flow.result && (
        <ImportReport
          result={flow.result}
          busy={flow.busy}
          onApply={flow.apply}
        />
      )}
    </div>
  );
}
