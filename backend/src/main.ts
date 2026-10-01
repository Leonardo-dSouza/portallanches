import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

// A importação de planilhas manda o arquivo em base64 no JSON (5 MB viram ~6,7 MB).
const JSON_BODY_LIMIT = '8mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  // 13000 no dev (porta pouco usada); a produção define PORT=3000 dentro do compose.
  await app.listen(process.env.PORT ?? 13000);
}
await bootstrap();
