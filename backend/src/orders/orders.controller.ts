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
import { OrderStatusService } from './order-status.service.js';
import { orderView, type OrderSaveView, type OrderView } from './order-view.js';
import { OrderService } from './order.service.js';

/** Toda resposta de pedido passa pelo `orderView`: os itens saem sem o CMV (2026-10-25). */
@Controller()
export class OrdersController {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(OrderStatusService) private readonly statuses: OrderStatusService,
    @Inject(OrderCancelService) private readonly cancels: OrderCancelService,
  ) {}

  @Get('orders/today')
  async listFor(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<OrderView[]> {
    const orders = await this.orders.listFor(user, date);
    return orders.map(orderView);
  }

  @Post('orders')
  async create(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
    @Query('date') date?: string,
  ): Promise<OrderSaveView> {
    return orderView(await this.orders.create(user, body, date));
  }

  @Put('orders/:id')
  async replace(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderSaveView> {
    return orderView(await this.orders.replace(user, id, body));
  }

  /** Um clique no status da lista: Em preparo → Saiu → Entregue (balcão sem o Saiu); `{ from }`. */
  @Post('orders/:id/status/next')
  @HttpCode(200)
  async advanceStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderView> {
    return orderView(await this.statuses.advance(user, id, body));
  }

  /** A seta ao lado do status: volta um passo (clique errado). */
  @Post('orders/:id/status/previous')
  @HttpCode(200)
  async revertStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderView> {
    return orderView(await this.statuses.revert(user, id, body));
  }

  /** Cancelar no lugar do antigo DELETE (2026-10-15): `{ reason, managerPassword? }`. */
  @Post('orders/:id/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OrderView> {
    return orderView(await this.cancels.cancel(user, id, body));
  }

  @Roles('ADMIN')
  @Post('orders/:id/restore')
  @HttpCode(200)
  async restore(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderView> {
    return orderView(await this.cancels.restore(user, id));
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
  async listByDate(@Param('date') date: string): Promise<OrderView[]> {
    const orders = await this.orders.listByDate(date);
    return orders.map(orderView);
  }
}
