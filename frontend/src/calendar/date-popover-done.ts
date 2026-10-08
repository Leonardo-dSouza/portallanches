import { createContext, useContext } from 'react';

/** "Pronto" do painel de data: fecha e devolve o foco ao botão do campo. */
export const DatePopoverDone = createContext<() => void>(() => undefined);

/** @example const done = useDatePopoverDone(); onClick={() => { onPick(day); done(); }} */
export const useDatePopoverDone = (): (() => void) =>
  useContext(DatePopoverDone);
