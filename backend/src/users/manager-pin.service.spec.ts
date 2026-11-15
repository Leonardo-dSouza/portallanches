import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  ADMIN_PIN,
  FAKE_MANAGER_PIN,
  FakeUserRepository,
} from '../auth/auth-fakes.fixture.js';
import { verifyPassword } from '../auth/password-hasher.js';
import type { SessionUser } from '../auth/session-user.js';
import { ManagerPinService } from './manager-pin.service.js';
import { FakeUsersRepository } from './users-fakes.fixture.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const OTHER_ADMIN: SessionUser = { id: 2, name: 'gerente', role: 'ADMIN' };

/** O admin 1 já tem o código FAKE_MANAGER_PIN; o 2 ainda não. */
function build() {
  const users = new FakeUsersRepository();
  const admins = new FakeUserRepository([], [ADMIN_PIN]);
  return { pins: new ManagerPinService(users, admins), users };
}

describe('ManagerPinService (S-04)', () => {
  it('diz se o admin logado já cadastrou o código', async () => {
    const { pins } = build();
    expect(await pins.statusFor(ADMIN)).toEqual({ configured: false });
    await pins.setOwn(ADMIN, { currentPassword: 'admin123', pin: '739164' });
    expect(await pins.statusFor(ADMIN)).toEqual({ configured: true });
  });

  it('grava só o hash do código, com a senha atual certa', async () => {
    const { pins, users } = build();
    await pins.setOwn(ADMIN, { currentPassword: 'admin123', pin: '739164' });
    const stored = users.pinHashes.get(1)!;
    expect(stored).not.toContain('739164');
    expect(await verifyPassword('739164', stored)).toBe(true);
  });

  it('senha atual errada: 401 e nada gravado', async () => {
    const { pins, users } = build();
    await expect(
      pins.setOwn(ADMIN, { currentPassword: 'errada', pin: '739164' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(users.pinHashes.size).toBe(0);
  });

  it.each(['12345', '1234567', 'abcdef', '111111', '123456', '987654'])(
    'recusa o código %j',
    async (pin) => {
      await expect(
        build().pins.setOwn(ADMIN, { currentPassword: 'admin123', pin }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('recusa o código que já é de outro admin, sem dizer de quem', async () => {
    await expect(
      build().pins.setOwn(OTHER_ADMIN, {
        currentPassword: 'caixa123',
        pin: FAKE_MANAGER_PIN,
      }),
    ).rejects.toThrow(/já é de outro admin/);
  });

  it('o próprio admin pode repetir o código que já é dele', async () => {
    await expect(
      build().pins.setOwn(ADMIN, {
        currentPassword: 'admin123',
        pin: FAKE_MANAGER_PIN,
      }),
    ).resolves.toBeUndefined();
  });
});
