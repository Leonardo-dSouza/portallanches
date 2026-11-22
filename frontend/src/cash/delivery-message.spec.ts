import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../settings/app-settings-context';
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

  it('as mensagens padrão saem com o código do pedido entre colchetes', () => {
    const { deliveryCodeConfirmMessage, deliveryCodeRouteMessage } =
      DEFAULT_APP_SETTINGS;
    for (const template of [
      deliveryCodeConfirmMessage,
      deliveryCodeRouteMessage,
    ])
      expect(fillDeliveryMessage(template, '2643')).toContain(
        'Código de entrega: [2643]',
      );
  });
});
