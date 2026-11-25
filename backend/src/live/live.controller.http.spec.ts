import http from 'node:http';
import { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthService } from '../auth/auth.service.js';
import { SessionUser } from '../auth/session-user.js';
import { DataChangeBus } from './data-change-bus.js';
import { LiveController } from './live.controller.js';

class FakeSessionAuth {
  authenticate(token: string): SessionUser | undefined {
    if (token === 'tok') {
      return { id: 1, name: 'caixa', role: 'CAIXA' };
    }
    return undefined;
  }
}

describe('LiveController (HTTP)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('solta o bus quando o cliente HTTP desconecta', async () => {
    const bus = new DataChangeBus();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [LiveController],
      providers: [
        { provide: DataChangeBus, useValue: bus },
        { provide: AuthService, useClass: FakeSessionAuth },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    const port = address.port;

    await new Promise<void>((resolve) => {
      const req = http.get(
        `http://127.0.0.1:${port}/live/events`,
        { headers: { authorization: 'Bearer tok' } },
        (res) => {
          res.on('data', (chunk: Buffer) => {
            if (chunk.toString().includes('ready')) {
              req.destroy();
            }
          });
          res.on('error', () => {
            // Ignora erro de socket fechado no cliente
          });
        },
      );

      req.on('error', () => {
        // Ignora erro no cliente após destroy
      });

      req.on('close', () => {
        const checkBus = () => {
          const isObserved = (bus.changes() as Subject<void>).observed;
          if (!isObserved) {
            expect(isObserved).toBe(false);
            resolve();
          } else {
            setTimeout(checkBus, 10);
          }
        };
        setTimeout(checkBus, 10);
      });
    });
  });
});
