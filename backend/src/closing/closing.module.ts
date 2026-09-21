import { Module } from '@nestjs/common';
import { BUSINESS_TIMEZONE, CLOCK } from '../common/clock.js';
import { DEFAULT_BUSINESS_TIMEZONE, toBusinessDate } from './business-date.js';
import { CLOSING_LOOKUP, CLOSING_RANGE_LOOKUP } from './closing-lookup.js';
import { CLOSING_REPOSITORY } from './closing-repository.js';
import { ClosingController } from './closing.controller.js';
import { ClosingService } from './closing.service.js';
import { PrismaClosingRepository } from './prisma-closing.repository.js';

/** `BUSINESS_TIMEZONE` do ambiente; fuso inválido derruba a subida em vez de errar datas depois. */
function readBusinessTimeZone(): string {
  const timeZone = process.env.BUSINESS_TIMEZONE ?? DEFAULT_BUSINESS_TIMEZONE;
  try {
    toBusinessDate(new Date(), timeZone);
  } catch {
    throw new Error(
      `BUSINESS_TIMEZONE inválido "${timeZone}": esperado um fuso IANA (ex.: America/Sao_Paulo)`,
    );
  }
  return timeZone;
}

@Module({
  controllers: [ClosingController],
  providers: [
    ClosingService,
    { provide: CLOSING_REPOSITORY, useClass: PrismaClosingRepository },
    { provide: CLOSING_LOOKUP, useExisting: ClosingService },
    { provide: CLOSING_RANGE_LOOKUP, useExisting: ClosingService },
    { provide: CLOCK, useValue: () => new Date() },
    { provide: BUSINESS_TIMEZONE, useFactory: readBusinessTimeZone },
  ],
  exports: [ClosingService, CLOSING_LOOKUP, CLOSING_RANGE_LOOKUP],
})
export class ClosingModule {}
