import { Module } from '@nestjs/common';
import { CLOCK } from '../common/clock.js';
import { CLOSING_LOOKUP, CLOSING_RANGE_LOOKUP } from './closing-lookup.js';
import { CLOSING_REPOSITORY } from './closing-repository.js';
import { ClosingController } from './closing.controller.js';
import { ClosingService } from './closing.service.js';
import { PrismaClosingRepository } from './prisma-closing.repository.js';

@Module({
  controllers: [ClosingController],
  providers: [
    ClosingService,
    { provide: CLOSING_REPOSITORY, useClass: PrismaClosingRepository },
    { provide: CLOSING_LOOKUP, useExisting: ClosingService },
    { provide: CLOSING_RANGE_LOOKUP, useExisting: ClosingService },
    { provide: CLOCK, useValue: () => new Date() },
  ],
  exports: [ClosingService, CLOSING_LOOKUP, CLOSING_RANGE_LOOKUP],
})
export class ClosingModule {}
