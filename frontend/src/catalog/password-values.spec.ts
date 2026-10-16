import { describe, expect, it } from 'vitest';
import { parseNewPassword } from './password-values';

describe('parseNewPassword', () => {
  it('aceita 6 ou mais caracteres digitados igual duas vezes', () => {
    expect(parseNewPassword('nova123', 'nova123')).toEqual({
      ok: true,
      value: 'nova123',
    });
  });

  it('recusa curta ou diferente, sem repetir a senha na mensagem', () => {
    const short = parseNewPassword('abc', 'abc');
    expect(short).toMatchObject({ ok: false });
    if (!short.ok) expect(short.error).not.toContain('abc');
    expect(parseNewPassword('nova123', 'nova124')).toMatchObject({
      ok: false,
      error: expect.stringContaining('não batem'),
    });
  });
});
