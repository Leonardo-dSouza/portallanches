import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import {
  AppSettingsService,
  type AppSettings,
} from './app-settings.service.js';

/** Leitura aberta a qualquer logado; mudar só o admin (Cadastros → Insumos). */
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(AppSettingsService) private readonly settings: AppSettingsService,
  ) {}

  @Get()
  read(): Promise<AppSettings> {
    return this.settings.read();
  }

  @Roles('ADMIN')
  @Put()
  update(@Body() body: unknown): Promise<AppSettings> {
    return this.settings.update(body);
  }
}
