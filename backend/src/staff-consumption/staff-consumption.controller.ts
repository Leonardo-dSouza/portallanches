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
  StaffConsumptionService,
  type StaffConsumptionSaveResponse,
  type StaffConsumptionView,
} from './staff-consumption.service.js';

@Controller()
export class StaffConsumptionController {
  constructor(
    @Inject(StaffConsumptionService)
    private readonly consumptions: StaffConsumptionService,
  ) {}

  @Get('staff-consumptions/today')
  listFor(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<StaffConsumptionView[]> {
    return this.consumptions.listFor(user, date);
  }

  @Get('staff-consumptions/names')
  recentNames(): Promise<string[]> {
    return this.consumptions.recentNames();
  }

  @Post('staff-consumptions')
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
    @Query('date') date?: string,
  ): Promise<StaffConsumptionSaveResponse> {
    return this.consumptions.create(user, body, date);
  }

  @Put('staff-consumptions/:id')
  replace(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<StaffConsumptionSaveResponse> {
    return this.consumptions.replace(user, id, body);
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
  listByDate(@Param('date') date: string): Promise<StaffConsumptionView[]> {
    return this.consumptions.listByDate(date);
  }
}
