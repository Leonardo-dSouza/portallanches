import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { withoutFieldsFor } from '../auth/cost-visibility.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import {
  AppSettingsService,
  type AppSettings,
} from './app-settings.service.js';

/** Margem e comissão do iFood: só o admin recebe (S-09). */
const IFOOD_MARGIN_FIELDS = [
  'ifoodProfitPercent',
  'ifoodCommissionPercent',
] as const;

/** Leitura aberta a qualquer logado; mudar só o admin (Cadastros → Insumos e Comanda). */
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(AppSettingsService) private readonly settings: AppSettingsService,
  ) {}

  @Get()
  async read(@CurrentUser() user: SessionUser): Promise<Partial<AppSettings>> {
    return withoutFieldsFor(
      user,
      await this.settings.read(),
      IFOOD_MARGIN_FIELDS,
    );
  }

  @Roles('ADMIN')
  @Put()
  update(@Body() body: unknown): Promise<AppSettings> {
    return this.settings.update(body);
  }
}
