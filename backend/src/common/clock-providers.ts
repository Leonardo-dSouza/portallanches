import type { Provider } from '@nestjs/common';
import { readBusinessTimeZone } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK } from './clock.js';

/** Relógio real e fuso da lanchonete para os módulos que precisam do dia de negócio. */
export const BUSINESS_CLOCK_PROVIDERS: Provider[] = [
  { provide: CLOCK, useValue: () => new Date() },
  { provide: BUSINESS_TIMEZONE, useFactory: readBusinessTimeZone },
];
