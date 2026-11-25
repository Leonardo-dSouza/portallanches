import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module.js';
import { AnnounceWritesInterceptor } from './announce-writes.interceptor.js';
import { DataChangeBus } from './data-change-bus.js';
import { LiveController } from './live.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [LiveController],
  providers: [
    DataChangeBus,
    {
      provide: APP_INTERCEPTOR,
      useClass: AnnounceWritesInterceptor,
    },
  ],
  exports: [DataChangeBus],
})
export class LiveModule {}
