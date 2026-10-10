import { useState } from 'react';
import {
  readAutoPrint,
  writeAutoPrint,
  type AutoPrintStorage,
} from './auto-print-setting';

/** `localStorage`, ou nada se o navegador recusar até o acesso a ele. */
function browserStorage(): AutoPrintStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * "Imprimir ao salvar" deste PC, lembrado entre as visitas (ver `auto-print-setting`).
 *
 * @example const [autoPrint, setAutoPrint] = useAutoPrint();
 */
export function useAutoPrint(): [boolean, (on: boolean) => void] {
  const [storage] = useState(browserStorage);
  const [on, setOn] = useState(() =>
    storage ? readAutoPrint(storage) : false,
  );
  const change = (next: boolean) => {
    setOn(next);
    if (storage) writeAutoPrint(storage, next);
  };
  return [on, change];
}
