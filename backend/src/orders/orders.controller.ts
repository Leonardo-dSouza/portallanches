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
import type { OrderRecord } from './order-repository.js';
import { OrderService } from './order.service.js';

@Controller()
export class OrdersController {
  constructor(@Inject(OrderService) private readonly orders: OrderService) {}

  @Get('orders/today')
  listFor(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<OrderRecord[]> {
    return this.orders.listFor(user, date);
  }

  @Post('orders')
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
    @Query('date') date?: string,
  ): Promise<OrderRecord> {
    return this.orders.create(user, body, date);
  }

  @Put('orders/:id')
  replace(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderRecord> {
    return this.orders.replace(user, id, body);
  }

  @Delete('orders/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.orders.remove(user, id);
  }

  @Roles('ADMIN')
  @Get('closings/:date/orders')
  listByDate(@Param('date') date: string): Promise<OrderRecord[]> {
    return this.orders.listByDate(date);
  }
}
