import { Controller, Headers, Inject, MessageEvent, Sse } from '@nestjs/common';
import { interval, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service.js';
import { extractBearerToken } from '../auth/bearer-token.js';
import { DataChangeBus } from './data-change-bus.js';
import { buildLiveEvents, LIVE_HEARTBEAT_MS } from './live-events.js';

/**
 * Endpoint SSE para avisos em tempo real de alteração de dados no PDV.
 * Autenticado pelo AuthGuard global para ADMIN e CAIXA (sem @Roles, decisão de 2026-11-24).
 */
@Controller('live')
export class LiveController {
  constructor(
    @Inject(DataChangeBus) private readonly bus: DataChangeBus,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  /**
   * Stream de eventos do caixa com heartbeat e encerramento após sessão vencida.
   * O guard já validou o token ao abrir; a cada batida ele é conferido de novo na memória
   * (`SessionStore`, sem renovar a sessão), para o stream de um usuário desativado fechar.
   *
   * @example GET /live/events com header Authorization: Bearer <token>
   */
  @Sse('events')
  events(
    @Headers('authorization') authorization: string | undefined,
  ): Observable<MessageEvent> {
    const token = extractBearerToken(authorization) ?? '';
    const isSessionAlive = () => this.auth.authenticate(token) !== undefined;
    const heartbeat = interval(LIVE_HEARTBEAT_MS);
    return buildLiveEvents(this.bus.changes(), heartbeat, isSessionAlive);
  }
}
