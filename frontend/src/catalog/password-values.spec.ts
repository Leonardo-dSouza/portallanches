import { describe, expect, it } from 'vitest';
import { parseNewPassword } from './password-values';

describe('parseNewPassword', () => {
  it('caixa: 8 ou mais caracteres digitados igual duas vezes', () => {
    expect(parseNewPassword('cebola-7', 'cebola-7', 'CAIXA')).toEqual({
      ok: true,
      value: 'cebola-7',
    });
  });

  it('admin: pelo menos 10', () => {
    expect(parseNewPassword('cebola-7', 'cebola-7', 'ADMIN')).toMatchObject({
      ok: false,
      error: expect.stringContaining('pelo menos 10'),
    });
    expect(parseNewPassword('cebola-77x', 'cebola-77x', 'ADMIN')).toMatchObject(
      {
        ok: true,
      },
    );
  });

  it('recusa curta ou diferente, sem repetir a senha na mensagem', () => {
    const short = parseNewPassword('abc', 'abc', 'CAIXA');
    expect(short).toMatchObject({ ok: false });
    if (!short.ok) expect(short.error).not.toContain('abc');
    expect(parseNewPassword('cebola-77', 'cebola-78', 'CAIXA')).toMatchObject({
      ok: false,
      error: expect.stringContaining('não batem'),
    });
  });
});
