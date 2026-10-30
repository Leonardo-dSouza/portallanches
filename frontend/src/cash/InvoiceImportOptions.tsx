import { ExternalLink, ScanLine, X } from 'lucide-react';
import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { TextField } from '../components/TextField';
import { sefazLinkOf } from './nfce-link';
import type { InvoiceReaderState } from './use-invoice-reader';

/**
 * As duas formas de importar a nota (pedido do usuário, 2026-10-30): colar o link ou a chave
 * (o leitor USB digita o link e o Enter, por isso o foco cai aqui) ou subir o HTML salvo no
 * navegador, que é a saída quando a SEFAZ recusa o servidor. O Enter lê a nota em vez de
 * salvar o gasto.
 */
export function InvoiceImportOptions({
  reader,
}: {
  reader: InvoiceReaderState;
}) {
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => codeRef.current?.focus(), []);
  const link = sefazLinkOf(reader.code);
  const readOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void reader.read();
  };
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Limpa para o mesmo arquivo poder ser escolhido de novo depois de uma recusa.
    event.target.value = '';
    if (file) void reader.importFile(file);
  };
  return (
    <div className="invoice-import" role="group" aria-label="Importar a nota">
      <div className="invoice-code-row">
        <TextField
          ref={codeRef}
          label="Colar link ou chave"
          value={reader.code}
          onChange={reader.setCode}
          onKeyDown={readOnEnter}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="button button-secondary"
          disabled={reader.reading}
          aria-busy={reader.reading}
          onClick={() => void reader.read()}
        >
          <ScanLine aria-hidden />
          Ler
        </button>
      </div>
      <label className="field">
        Importar HTML
        <input
          type="file"
          accept=".html,.htm"
          disabled={reader.reading}
          onChange={chooseFile}
        />
      </label>
      <p className="hint">
        Abra a nota na SEFAZ, salve a página com Ctrl+S e escolha o arquivo.
      </p>
      <div className="invoice-import-actions">
        {link && (
          <a
            className="button button-secondary button-sm"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            Abrir na SEFAZ
          </a>
        )}
        <button
          type="button"
          className="button-ghost button-sm"
          onClick={reader.closeImport}
        >
          <X aria-hidden />
          Fechar
        </button>
      </div>
    </div>
  );
}
