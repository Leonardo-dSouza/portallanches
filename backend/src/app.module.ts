import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ClosingModule } from './closing/closing.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [PrismaModule, AuthModule, ClosingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
