import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupHttpServer } from './common/http-setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupHttpServer(app);
  // 13000 no dev (porta pouco usada); a produção define PORT=3000 dentro do compose.
  await app.listen(process.env.PORT ?? 13000);
}
await bootstrap();
