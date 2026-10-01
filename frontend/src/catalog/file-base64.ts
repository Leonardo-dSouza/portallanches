/** Lê um arquivo escolhido pelo usuário como base64 (sem o prefixo `data:...;base64,`). */
export type FileReaderFn = (file: File) => Promise<string>;

/**
 * Implementação do navegador sobre `FileReader`; os testes injetam uma falsa.
 *
 * @example const base64 = await readFileAsBase64(input.files[0]);
 */
export const readFileAsBase64: FileReaderFn = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () =>
      reject(new Error(`Não deu para ler o arquivo "${file.name}"`));
    reader.readAsDataURL(file);
  });
