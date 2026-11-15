import type { IncomingMessage } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { trackRequestOrigin } from './request-origin.js';

/**
 * Corpo JSON padrão (S-12, 2026-11-15). Era 8 MB por causa da importação de planilha, que saiu em
 * 2026-11-10; o maior corpo comum hoje é um pedido de 50 itens, poucos KB.
 */
export const DEFAULT_JSON_LIMIT = '100kb';

/** Só as rotas que levam o HTML salvo da nota (`MAX_INVOICE_PAGE_LENGTH` em `expense-input.ts`). */
export const INVOICE_PAGE_JSON_LIMIT = '3mb';

const INVOICE_PAGE_ROUTES: readonly { method: string; path: RegExp }[] = [
  { method: 'POST', path: /^\/expense-invoices\/preview\/?$/ },
  { method: 'POST', path: /^\/expenses\/?$/ },
  { method: 'PUT', path: /^\/expenses\/\d+\/?$/ },
];

/**
 * Se a rota recebe o HTML da nota (a única com corpo grande).
 *
 * @example carriesInvoicePage('PUT', '/expenses/12?date=2026-11-15') // true
 */
export function carriesInvoicePage(
  method: string | undefined,
  url: string | undefined,
): boolean {
  const path = (url ?? '').split('?')[0];
  return INVOICE_PAGE_ROUTES.some(
    (route) => route.method === method && route.path.test(path),
  );
}

function isInvoicePageJson(request: IncomingMessage): boolean {
  const contentType = request.headers['content-type'] ?? '';
  return (
    /\bjson\b/i.test(contentType) &&
    carriesInvoicePage(request.method, request.url)
  );
}

/**
 * Prepara o servidor HTTP antes do `listen` (o `main.ts` e o teste usam a mesma):
 * - `trust proxy` 1: o único salto confiável é o nginx (o backend não publica porta na produção);
 *   o `req.ip` vira o IP que o nginx viu, não o que o cliente escreveu no `X-Forwarded-For`.
 * - corpo de 100 KB, e 3 MB só nas rotas da nota: o primeiro leitor pega essas rotas e o segundo,
 *   o resto (o Express pula o leitor seguinte quando o corpo já foi lido).
 * - origem do pedido para o limitador de senhas, depois dos leitores de corpo.
 *
 * @example const app = await NestFactory.create<NestExpressApplication>(AppModule); setupHttpServer(app);
 */
export function setupHttpServer(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.useBodyParser('json', {
    limit: INVOICE_PAGE_JSON_LIMIT,
    type: isInvoicePageJson,
  });
  app.useBodyParser('json', { limit: DEFAULT_JSON_LIMIT });
  app.use(trackRequestOrigin);
}
