import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import {
  consumptionFor,
  type ConsumptionResponse,
} from './consumption-response.js';
import {
  StaffConsumptionService,
  type StaffConsumptionSaveResponse,
  type StaffConsumptionView,
} from './staff-consumption.service.js';

/** Toda resposta passa pelo `consumptionFor`: itens sem CMV e o custo só para o admin (2026-10-25). */
@Controller()
export class StaffConsumptionController {
  constructor(
    @Inject(StaffConsumptionService)
    private readonly consumptions: StaffConsumptionService,
  ) {}

  @Get('staff-consumptions/today')
  async listFor(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<ConsumptionResponse<StaffConsumptionView>[]> {
    const consumptions = await this.consumptions.listFor(user, date);
    return consumptions.map((consumption) => consumptionFor(user, consumption));
  }

  @Get('staff-consumptions/names')
  recentNames(): Promise<string[]> {
    return this.consumptions.recentNames();
  }

  @Post('staff-consumptions')
  async create(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
    @Query('date') date?: string,
  ): Promise<ConsumptionResponse<StaffConsumptionSaveResponse>> {
    const saved = await this.consumptions.create(user, body, date);
    return consumptionFor(user, saved);
  }

  @Put('staff-consumptions/:id')
  async replace(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ConsumptionResponse<StaffConsumptionSaveResponse>> {
    const saved = await this.consumptions.replace(user, id, body);
    return consumptionFor(user, saved);
  }

  @Delete('staff-consumptions/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.consumptions.remove(user, id);
  }

  @Roles('ADMIN')
  @Get('closings/:date/staff-consumptions')
  async listByDate(
    @CurrentUser() user: SessionUser,
    @Param('date') date: string,
  ): Promise<ConsumptionResponse<StaffConsumptionView>[]> {
    const consumptions = await this.consumptions.listByDate(date);
    return consumptions.map((consumption) => consumptionFor(user, consumption));
  }
}
