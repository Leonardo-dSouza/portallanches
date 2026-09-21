export const CLOCK = Symbol('CLOCK');

/** Fonte de "agora" injetada para os testes não dependerem do relógio real. */
export type Clock = () => Date;

/** Fuso IANA (ex.: `America/Sao_Paulo`) que define a virada do dia de negócio. */
export const BUSINESS_TIMEZONE = Symbol('BUSINESS_TIMEZONE');
