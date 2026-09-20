import { Module } from '@nestjs/common';
import { CLOCK } from '../common/clock.js';
import { CLOSING_REPOSITORY } from './closing-repository.js';
import { ClosingController } from './closing.controller.js';
import { ClosingService } from './closing.service.js';
import { PrismaClosingRepository } from './prisma-closing.repository.js';

@Module({
  controllers: [ClosingController],
  providers: [
    ClosingService,
    { provide: CLOSING_REPOSITORY, useClass: PrismaClosingRepository },
    { provide: CLOCK, useValue: () => new Date() },
  ],
  exports: [ClosingService],
})
export class ClosingModule {}
