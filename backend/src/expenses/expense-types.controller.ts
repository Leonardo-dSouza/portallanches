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
import type { ExpenseTypeRecord } from './expense-type-repository.js';
import { ExpenseTypeService } from './expense-type.service.js';

/** Leitura e criação para qualquer logado (caixa cria tipo na hora); edição só admin. */
@Controller('expense-types')
export class ExpenseTypesController {
  constructor(
    @Inject(ExpenseTypeService) private readonly types: ExpenseTypeService,
  ) {}

  @Get()
  list(): Promise<ExpenseTypeRecord[]> {
    return this.types.list();
  }

  @Post()
  create(@Body() body: unknown): Promise<ExpenseTypeRecord> {
    return this.types.create(body);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ExpenseTypeRecord> {
    return this.types.update(id, body);
  }
}
