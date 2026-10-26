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
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import {
  FiadoPaymentService,
  type FiadoReceipt,
} from './fiado-payment.service.js';
import { FiadoQueryService } from './fiado-query.service.js';
import type {
  FiadoDebtor,
  FiadoDueOrder,
  FiadoStatement,
} from './fiado-views.js';

/**
 * Fiado (pedido do usuário, 2026-10-25): o caixa lança e recebe sozinho; caixa e admin veem
 * tudo. Nenhuma resposta leva custo (só valores do pedido e dos recebimentos).
 */
@Controller('fiado')
export class FiadoController {
  constructor(
    @Inject(FiadoQueryService) private readonly queries: FiadoQueryService,
    @Inject(FiadoPaymentService) private readonly payments: FiadoPaymentService,
  ) {}

  /** Quem deve, com os pedidos em aberto (sem paginação: a aba tem a busca). */
  @Get('open')
  listOpen(): Promise<FiadoDebtor[]> {
    return this.queries.listOpen();
  }

  /** Os fiados de outras noites a cobrar nesta (`?date=`, padrão a noite em andamento). */
  @Get('due')
  listDue(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<FiadoDueOrder[]> {
    return this.queries.listDue(user, date);
  }

  @Get('customers/:id')
  statement(@Param('id', ParseIntPipe) id: number): Promise<FiadoStatement> {
    return this.queries.statement(id);
  }

  /** `{ amount, extra?, paymentMethodId, paymentMode?, date? }`. */
  @Post('orders/:id/payments')
  receive(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<FiadoReceipt> {
    return this.payments.receive(user, id, body);
  }

  /** Estorno: `{ reason, managerPassword? }` (a mesma trava do cancelar). */
  @Post('payments/:id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<FiadoReceipt> {
    return this.payments.cancel(user, id, body);
  }

  /** Remarcar a previsão: `{ dueDate: 'YYYY-MM-DD' | null }`, sem senha. */
  @Put('orders/:id/due-date')
  reschedule(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<{ orderId: number; dueDate: string | null }> {
    return this.payments.reschedule(user, id, body);
  }
}
