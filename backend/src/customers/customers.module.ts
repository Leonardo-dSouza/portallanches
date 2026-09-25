import { Module } from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  CUSTOMER_ZONE_CHECK,
} from './customer-repository.js';
import { CustomerService } from './customer.service.js';
import { CustomersController } from './customers.controller.js';
import {
  PrismaCustomerRepository,
  PrismaCustomerZoneCheck,
} from './prisma-customer.repository.js';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomerService,
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    { provide: CUSTOMER_ZONE_CHECK, useClass: PrismaCustomerZoneCheck },
  ],
})
export class CustomersModule {}
