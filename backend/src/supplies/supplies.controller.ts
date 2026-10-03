import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import type { SupplyRecord, SupplySectionRecord } from './supply-repository.js';
import { SupplyService } from './supply.service.js';

/** Lista aberta a qualquer logado (o caixa conta e lança entradas); cadastro só do admin. */
@Controller('supplies')
export class SuppliesController {
  constructor(
    @Inject(SupplyService) private readonly supplies: SupplyService,
  ) {}

  @Get()
  list(): Promise<SupplyRecord[]> {
    return this.supplies.list();
  }

  @Get('sections')
  listSections(): Promise<SupplySectionRecord[]> {
    return this.supplies.listSections();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: unknown): Promise<SupplyRecord> {
    return this.supplies.create(body);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<SupplyRecord> {
    return this.supplies.update(id, body);
  }
}
