import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ExpenseInvoiceDetail } from './expense-invoice-repository.js';
import {
  ExpenseInvoiceService,
  type InvoicePreview,
} from './expense-invoice.service.js';

@Controller('expense-invoices')
export class ExpenseInvoicesController {
  constructor(
    @Inject(ExpenseInvoiceService)
    private readonly invoices: ExpenseInvoiceService,
  ) {}

  @Post('preview')
  @HttpCode(200)
  preview(@Body() body: unknown): Promise<InvoicePreview> {
    return this.invoices.preview(body);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExpenseInvoiceDetail> {
    return this.invoices.detail(user, id);
  }
}
