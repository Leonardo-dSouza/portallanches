/** Saídas do texto da lista (injetáveis: jsdom não tem área de transferência nem download). */
export interface TextExport {
  /** Copia o texto; `source` é a caixa de texto usada no plano B. Devolve se deu certo. */
  copy(text: string, source: HTMLTextAreaElement | null): Promise<boolean>;
  download(filename: string, text: string): void;
}

/**
 * Plano B da cópia: `navigator.clipboard` só existe em HTTPS ou localhost, e a demo roda em
 * HTTP pelo IP da rede. Seleciona o texto e usa o comando antigo de copiar.
 */
function copyBySelection(source: HTMLTextAreaElement | null): boolean {
  if (!source) return false;
  source.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

async function copy(
  text: string,
  source: HTMLTextAreaElement | null,
): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permissão negada: tenta o plano B.
    }
  }
  return copyBySelection(source);
}

function download(filename: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** @example await browserTextExport.copy('Lista...', textareaRef.current) */
export const browserTextExport: TextExport = { copy, download };
