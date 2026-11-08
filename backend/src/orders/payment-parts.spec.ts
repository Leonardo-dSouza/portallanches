import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertFiado } from './order-payment.js';
import { FakeOrderCatalog } from './order-fakes.fixture.js';
import type { PaymentMethodEntry } from './order-repository.js';
import {
  assertPartsSum,
  assertPaymentCovers,
  isSplitPayment,
  parsePaymentParts,
  parseSplitChoice,
  resolvePaymentParts,
  type PaymentPart,
} from './payment-parts.js';

// As formas do `FakeOrderCatalog`: 1 comum (PIX), 2 dinheiro, 3 maquininha, 4 fiado, 9 inativa.
const catalog = new FakeOrderCatalog();
const PIX: PaymentMethodEntry = {
  id: 1,
  active: true,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
};
const pix = (amount: string): PaymentPart => ({
  paymentMethodId: 1,
  paymentMode: null,
  amount,
});
const cash = (amount: string): PaymentPart => ({
  paymentMethodId: 2,
  paymentMode: null,
  amount,
});

describe('payment-parts', () => {
  describe('Regra 1: pelo menos 2 partes e cada amount > 0', () => {
    it('recusa menos de 2 partes', () => {
      expect(() => parsePaymentParts([])).toThrow(BadRequestException);
      expect(() => parsePaymentParts([])).toThrow(
        'Pagamento dividido precisa de pelo menos 2 partes: recebido 0, esperado lista com 2 ou mais partes',
      );
      expect(() =>
        parsePaymentParts([{ paymentMethodId: 1, amount: '20.00' }]),
      ).toThrow(
        'Pagamento dividido precisa de pelo menos 2 partes: recebido 1, esperado lista com 2 ou mais partes',
      );
    });

    it('recusa amount zerado ou negativo', () => {
      expect(() =>
        parsePaymentParts([
          { paymentMethodId: 1, amount: '0' },
          { paymentMethodId: 2, amount: '20.00' },
        ]),
      ).toThrow(BadRequestException);
      expect(() =>
        parsePaymentParts([
          { paymentMethodId: 1, amount: '-10.00' },
          { paymentMethodId: 2, amount: '20.00' },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('Regra 2: soma das partes igual ao total do pedido', () => {
    it('422 com mensagem citando soma das partes e total do pedido', () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '20.00' },
      ];
      expect(() => assertPartsSum(parts, '50.00')).toThrow(
        UnprocessableEntityException,
      );
      expect(() => assertPartsSum(parts, '50.00')).toThrow(
        'Partes somam 40.00, total do pedido 50.00: esperado que as partes somem exatamente o total do pedido',
      );
    });

    it('passa quando a soma é idêntica ao total', () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      expect(() => assertPartsSum(parts, '50.00')).not.toThrow();
    });
  });

  describe('Regra 3: forma ativa e meio só na maquininha', () => {
    it('recusa forma inativa', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 9, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(
        'Forma de pagamento 9 inexistente ou inativa: esperado id de uma forma ativa em payment_methods',
      );
    });

    it('recusa maquininha sem paymentMode', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 3, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(
        'Forma de pagamento 3 é maquininha: esperado "paymentMode" CREDIT, DEBIT ou PIX, recebido null',
      );
    });

    it('recusa paymentMode em forma que não é maquininha', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 1, paymentMode: 'PIX', amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(
        'Forma de pagamento 1 não é maquininha: esperado omitir "paymentMode", recebido "PIX"',
      );
    });
  });

  describe('Regra 4: nenhuma parte fiado', () => {
    it('recusa fiado como parte com 422', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 4, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(
        'Forma de pagamento 4 é fiado: esperado forma de pagamento imediata (fiado não pode ser parte de pagamento dividido)',
      );
    });
  });

  describe('Regra 5: no máximo uma parte em dinheiro', () => {
    it('recusa duas partes em dinheiro com 422', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 2, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).rejects.toThrow(
        'Pagamento dividido tem 2 partes em dinheiro: esperado no máximo uma parte em dinheiro',
      );
    });

    it('permite repetir formas que não são dinheiro (dois Ton débito)', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
        { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', null),
      ).resolves.toBeUndefined();
    });
  });

  describe('Regra 6: fiadoDueDate com partes é recusado', () => {
    it('assertFiado recusa previsão quando a 1ª forma não é fiado', () => {
      const input = { customerId: 10, fiadoDueDate: '2026-11-10' };
      expect(() => assertFiado(PIX, input, '2026-11-08')).toThrow(
        BadRequestException,
      );
      expect(() => assertFiado(PIX, input, '2026-11-08')).toThrow(
        '"fiadoDueDate" só vale para fiado: a forma 1 não é fiado',
      );
    });
  });

  describe('Regra 7: changeFor com partes', () => {
    it('changeFor com parte em dinheiro >= valor dessa parte é aceito', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', '50.00'),
      ).resolves.toBeUndefined();
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', '30.00'),
      ).resolves.toBeUndefined();
    });

    it('changeFor menor que o valor da parte em dinheiro lança 422', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', '25.00'),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', '25.00'),
      ).rejects.toThrow(
        'Troco para 25.00 é menor que a parte em dinheiro 30.00: esperado 30.00 ou mais',
      );
    });

    it('changeFor sem parte em dinheiro lança 422', async () => {
      const parts: PaymentPart[] = [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
      ];
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', '50.00'),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        resolvePaymentParts(catalog, parts, '50.00', '50.00'),
      ).rejects.toThrow(
        '"changeFor" só vale para dinheiro: a forma 1 não é dinheiro',
      );
    });
  });

  describe('isSplitPayment', () => {
    it('só 2 partes ou mais contam como dividido', () => {
      expect(
        isSplitPayment({ paymentParts: [pix('20.00'), cash('30.00')] }),
      ).toBe(true);
      expect(isSplitPayment({ paymentParts: [] })).toBe(false);
      expect(isSplitPayment({})).toBe(false);
    });
  });

  describe('parseSplitChoice', () => {
    it('null quando o corpo não traz partes (forma única de sempre)', () => {
      expect(parseSplitChoice({ paymentMethodId: 1 }, 'Pedido')).toBeNull();
    });

    it('a 1ª parte vira a forma do pedido', () => {
      const choice = parseSplitChoice(
        {
          paymentParts: [
            { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
            { paymentMethodId: 2, amount: '30.00' },
          ],
        },
        'Pedido',
      );
      expect(choice).toMatchObject({
        paymentMethodId: 3,
        paymentMode: 'DEBIT',
      });
      expect(choice?.paymentParts).toHaveLength(2);
    });

    it('400 com partes e forma única juntas, mostrando o que veio', () => {
      expect(() =>
        parseSplitChoice(
          { paymentMethodId: 1, paymentParts: [pix('20.00'), cash('30.00')] },
          'Pedido',
        ),
      ).toThrow(
        'Pedido com "paymentParts" não aceita "paymentMethodId" nem "paymentMode" (recebido 1 e undefined)',
      );
    });
  });

  describe('assertPaymentCovers', () => {
    it('uma forma: o troco vale contra o total', async () => {
      const cashMethod = await catalog.findPaymentMethod(2);
      await expect(
        assertPaymentCovers(
          catalog,
          { paymentParts: [], changeFor: '30.00' },
          cashMethod,
          '38.60',
        ),
      ).rejects.toThrow('Troco para 30.00 é menor que o total 38.60');
    });

    it('dividido: o troco vale contra a parte em dinheiro', async () => {
      const payment = {
        paymentParts: [pix('20.00'), cash('30.00')],
        changeFor: '30.00',
      };
      await expect(
        assertPaymentCovers(catalog, payment, PIX, '50.00'),
      ).resolves.toBeUndefined();
    });
  });
});
