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
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type {
  DeliveryZoneRecord,
  MotoboyRateRecord,
  PaymentMethodRecord,
} from './catalog-repository.js';
import { CatalogService } from './catalog.service.js';

/** Leitura liberada a qualquer usuário logado (o caixa precisa das listas); escrita só admin. */
@Controller()
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get('payment-methods')
  listPaymentMethods(): Promise<PaymentMethodRecord[]> {
    return this.catalog.listPaymentMethods();
  }

  @Roles('ADMIN')
  @Post('payment-methods')
  createPaymentMethod(@Body() body: unknown): Promise<PaymentMethodRecord> {
    return this.catalog.createPaymentMethod(body);
  }

  @Roles('ADMIN')
  @Put('payment-methods/:id')
  updatePaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<PaymentMethodRecord> {
    return this.catalog.updatePaymentMethod(id, body);
  }

  @Get('delivery-zones')
  listDeliveryZones(): Promise<DeliveryZoneRecord[]> {
    return this.catalog.listDeliveryZones();
  }

  @Roles('ADMIN')
  @Post('delivery-zones')
  createDeliveryZone(@Body() body: unknown): Promise<DeliveryZoneRecord> {
    return this.catalog.createDeliveryZone(body);
  }

  @Roles('ADMIN')
  @Put('delivery-zones/:id')
  updateDeliveryZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<DeliveryZoneRecord> {
    return this.catalog.updateDeliveryZone(id, body);
  }

  @Roles('ADMIN')
  @Get('motoboy-rates')
  listMotoboyRates(): Promise<MotoboyRateRecord[]> {
    return this.catalog.listMotoboyRates();
  }

  @Roles('ADMIN')
  @Post('motoboy-rates')
  createMotoboyRate(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<MotoboyRateRecord> {
    return this.catalog.createMotoboyRate(user.id, body);
  }
}
