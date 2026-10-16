import {
  Body,
  Controller,
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
import { OrderCancelService } from './order-cancel.service.js';
import type { OrderEventRecord } from './order-events.js';
import type { OrderRecord, OrderSaveResponse } from './order-repository.js';
import { OrderStatusService } from './order-status.service.js';
import { OrderService } from './order.service.js';

@Controller()
export class OrdersController {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(OrderStatusService) private readonly statuses: OrderStatusService,
    @Inject(OrderCancelService) private readonly cancels: OrderCancelService,
  ) {}

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
  ): Promise<OrderSaveResponse> {
    return this.orders.create(user, body, date);
  }

  @Put('orders/:id')
  replace(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderSaveResponse> {
    return this.orders.replace(user, id, body);
  }

  /** Um clique no status da lista: Em preparo → Saiu → Entregue (balcão sem o Saiu); `{ from }`. */
  @Post('orders/:id/status/next')
  @HttpCode(200)
  advanceStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderRecord> {
    return this.statuses.advance(user, id, body);
  }

  /** A seta ao lado do status: volta um passo (clique errado). */
  @Post('orders/:id/status/previous')
  @HttpCode(200)
  revertStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderRecord> {
    return this.statuses.revert(user, id, body);
  }

  /** Cancelar no lugar do antigo DELETE (2026-10-15): `{ reason, managerPassword? }`. */
  @Post('orders/:id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderRecord> {
    return this.cancels.cancel(user, id, body);
  }

  @Roles('ADMIN')
  @Post('orders/:id/restore')
  @HttpCode(200)
  restore(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderRecord> {
    return this.cancels.restore(user, id);
  }

  @Get('orders/:id/events')
  events(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderEventRecord[]> {
    return this.cancels.listEvents(user, id);
  }

  @Roles('ADMIN')
  @Get('closings/:date/orders')
  listByDate(@Param('date') date: string): Promise<OrderRecord[]> {
    return this.orders.listByDate(date);
  }
}
