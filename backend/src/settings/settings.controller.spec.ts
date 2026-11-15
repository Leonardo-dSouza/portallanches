import { costKeysIn } from '../auth/cost-keys.fixture.js';
import type { SessionUser } from '../auth/session-user.js';
import type { AppSettingsService } from './app-settings.service.js';
import { FixedSettings } from './settings-fakes.fixture.js';
import { SettingsController } from './settings.controller.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

function buildController(): SettingsController {
  // O controller só lê pelo `read`, que o FixedSettings tem.
  return new SettingsController(
    new FixedSettings() as unknown as AppSettingsService,
  );
}

describe('SettingsController (S-09)', () => {
  it('o caixa recebe as configurações sem a margem e a comissão do iFood', async () => {
    const forCashier = await buildController().read(CAIXA);
    expect(costKeysIn(forCashier)).toEqual([]);
    expect(forCashier.cashierFixMinutes).toBe(15);
  });

  it('o admin recebe tudo', async () => {
    expect(costKeysIn(await buildController().read(ADMIN))).toEqual([
      'ifoodProfitPercent',
      'ifoodCommissionPercent',
    ]);
  });
});
