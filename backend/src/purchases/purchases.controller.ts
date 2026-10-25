import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import type {
  OutsideItemsResult,
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-records.js';
import type { VendorRecord } from './purchase-repository.js';
import { PurchaseService } from './purchase.service.js';

/** Aba Compras: só admin (decisão do usuário em 2026-10-18), como Análise e Cadastros. */
@Roles('ADMIN')
@Controller('purchases')
export class PurchasesController {
  constructor(
    @Inject(PurchaseService) private readonly purchases: PurchaseService,
  ) {}

  /** Ex.: `GET /purchases/invoices?from=2026-10-01&to=2026-10-31`. */
  @Get('invoices')
  listInvoices(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<PurchaseInvoiceRow[]> {
    return this.purchases.listInvoices(from, to);
  }

  @Get('products')
  listProducts(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ProductPriceSummary[]> {
    return this.purchases.listProducts(from, to);
  }

  /** Ex.: `GET /purchases/products/history?vendorId=3&code=1128810&from=…&to=…`. */
  @Get('products/history')
  productHistory(
    @Query('vendorId') vendorId?: string,
    @Query('code') code?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ProductPurchase[]> {
    return this.purchases.productHistory(vendorId, code, from, to);
  }

  @Get('vendors')
  listVendors(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<VendorSummary[]> {
    return this.purchases.listVendors(from, to);
  }

  /** Itens da nota fora da lanchonete (2026-10-25): `{ positions: [9, 10] }`; o gasto acompanha. */
  @Put('invoices/:id/outside-items')
  markOutsideItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<OutsideItemsResult> {
    return this.purchases.markOutsideItems(id, body);
  }

  @Put('vendors/:id')
  renameVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<VendorRecord> {
    return this.purchases.renameVendor(id, body);
  }
}
