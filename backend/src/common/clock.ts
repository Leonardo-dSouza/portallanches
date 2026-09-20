export const CLOCK = Symbol('CLOCK');

/** Fonte de "agora" injetada para os testes não dependerem do relógio real. */
export type Clock = () => Date;
