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
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import {
  ManagerPinService,
  type ManagerPinStatus,
} from './manager-pin.service.js';
import type { UserRecord } from './users-repository.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(ManagerPinService) private readonly pins: ManagerPinService,
  ) {}

  @Roles('ADMIN')
  @Get('me/manager-pin')
  managerPinStatus(
    @CurrentUser() user: SessionUser,
  ): Promise<ManagerPinStatus> {
    return this.pins.statusFor(user);
  }

  @Roles('ADMIN')
  @Put('me/manager-pin')
  @HttpCode(204)
  setManagerPin(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<void> {
    return this.pins.setOwn(user, body);
  }

  /** Declarada antes de ':id/password' para "me" não ser lido como id. */
  @Post('me/password')
  @HttpCode(204)
  changeOwnPassword(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<void> {
    return this.users.changeOwnPassword(user, body);
  }

  @Roles('ADMIN')
  @Get()
  list(): Promise<UserRecord[]> {
    return this.users.list();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: unknown): Promise<UserRecord> {
    return this.users.create(body);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(
    @CurrentUser() actor: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<UserRecord> {
    return this.users.update(actor, id, body);
  }

  @Roles('ADMIN')
  @Post(':id/password')
  @HttpCode(204)
  resetPassword(
    @CurrentUser() actor: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<void> {
    return this.users.resetPassword(actor, id, body);
  }
}
