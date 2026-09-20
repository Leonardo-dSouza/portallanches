import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { Public } from './auth-decorators.js';
import { AuthService, type LoginResult } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { extractBearerToken } from './bearer-token.js';
import type { SessionUser } from './session-user.js';

interface LoginBody {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginBody): Promise<LoginResult> {
    return this.auth.login(
      String(body?.username ?? ''),
      String(body?.password ?? ''),
    );
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Headers('authorization') authorization?: string): void {
    const token = extractBearerToken(authorization);
    if (token) this.auth.logout(token);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest): SessionUser | undefined {
    return request.user;
  }
}
