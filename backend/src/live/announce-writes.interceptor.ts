import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DataChangeBus } from './data-change-bus.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATHS = new Set(['/costs/preview', '/expense-invoices/preview']);

/**
 * Verifica se a requisição grava algo que outra tela mostra.
 * Ignora rotas de autenticação e prévias que não persistem dados (decisão de 2026-11-24).
 *
 * @example isAnnouncedWrite('POST', '/orders') // true
 * @example isAnnouncedWrite('POST', '/auth/login') // false
 */
export function isAnnouncedWrite(method: string, urlWithPath: string): boolean {
  if (!WRITE_METHODS.has(method.toUpperCase())) {
    return false;
  }
  const cleanPath = urlWithPath.split('?')[0] ?? '';
  if (cleanPath.startsWith('/auth/') || cleanPath === '/auth') {
    return false;
  }
  return !EXCLUDED_PATHS.has(cleanPath);
}

/**
 * Interceptor global que dispara aviso no barramento após escritas bem-sucedidas.
 * Não emite nada se o handler lançar erro (decisão de 2026-11-24).
 */
@Injectable()
export class AnnounceWritesInterceptor implements NestInterceptor {
  constructor(private readonly bus: DataChangeBus) {}

  /**
   * Intercepta a chamada HTTP e avisa o barramento quando a escrita dá certo.
   *
   * @example app.useGlobalInterceptors(new AnnounceWritesInterceptor(bus));
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ method?: string; url?: string }>();
    const method = req?.method ?? '';
    const url = req?.url ?? '';

    if (!isAnnouncedWrite(method, url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.bus.announceChange();
      }),
    );
  }
}
