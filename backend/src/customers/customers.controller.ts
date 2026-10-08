import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { CustomerRecord } from './customer-repository.js';
import { CustomerService } from './customer.service.js';

/** Aberto a qualquer logado: o caixa cadastra e atualiza clientes durante o lançamento. */
@Controller('customers')
export class CustomersController {
  constructor(
    @Inject(CustomerService) private readonly customers: CustomerService,
  ) {}

  /** `?phone=` acha pelo telefone; sem telefone, `?name=` acha pelo nome (pode vir mais de um). */
  @Get()
  search(
    @Query('phone') phone?: string,
    @Query('name') name?: string,
  ): Promise<CustomerRecord[]> {
    if (phone) return this.customers.searchByPhone(phone);
    return this.customers.searchByName(name);
  }

  @Get('streets')
  listStreets(
    @Query('deliveryZoneId') deliveryZoneId?: string,
  ): Promise<string[]> {
    return this.customers.listStreets(deliveryZoneId);
  }

  @Post()
  create(@Body() body: unknown): Promise<CustomerRecord> {
    return this.customers.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<CustomerRecord> {
    return this.customers.update(id, body);
  }
}
