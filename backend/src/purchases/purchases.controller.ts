import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type {
  ItemLinkRecord,
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

  /** Liga um item da nota fiscal (mercado + código) a um insumo do estoque. */
  @Roles('ADMIN')
  @Put('item-links')
  saveItemLink(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<ItemLinkRecord> {
    return this.purchases.saveItemLink(user.id, body);
  }

  /** Remove a ligação de um item da nota ao estoque; 404 se inexistente. */
  @Roles('ADMIN')
  @Delete('item-links/:vendorId/:code')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItemLink(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('code') code: string,
  ): Promise<void> {
    return this.purchases.deleteItemLink(vendorId, code);
  }
}
