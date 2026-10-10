import { Module } from '@nestjs/common';
import { APP_SETTINGS_REPOSITORY } from './app-settings-repository.js';
import { AppSettingsService, SETTINGS_READER } from './app-settings.service.js';
import { PrismaAppSettingsRepository } from './prisma-app-settings.repository.js';
import { SettingsController } from './settings.controller.js';

/** Configurações que o dono muda pela tela (hoje: o aviso de saldo do caixa). */
@Module({
  controllers: [SettingsController],
  providers: [
    AppSettingsService,
    { provide: APP_SETTINGS_REPOSITORY, useClass: PrismaAppSettingsRepository },
    { provide: SETTINGS_READER, useExisting: AppSettingsService },
  ],
  exports: [SETTINGS_READER],
})
export class SettingsModule {}
