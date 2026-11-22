import { describe, expect, it } from 'vitest';
import { fillDeliveryMessage } from './delivery-message';

describe('fillDeliveryMessage', () => {
  it('troca todo [CÓDIGO] pelo código e mantém os parágrafos', () => {
    expect(
      fillDeliveryMessage('Código: *[CÓDIGO]*\n\nRepito: [CÓDIGO]', '4827'),
    ).toBe('Código: *4827*\n\nRepito: 4827');
  });

  it('texto sem [CÓDIGO] sai como está', () => {
    expect(fillDeliveryMessage('Saiu para entrega!', '4827')).toBe(
      'Saiu para entrega!',
    );
  });
});
