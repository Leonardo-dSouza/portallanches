import { cnpjRootOf, vendorDisplayName } from './vendor-display.js';

describe('cnpjRootOf', () => {
  it('fica com os 8 primeiros números, iguais em todas as filiais', () => {
    expect(cnpjRootOf('06057223058250')).toBe('06057223');
    expect(cnpjRootOf('06057223000171')).toBe('06057223');
  });
});

describe('vendorDisplayName', () => {
  it('usa o apelido quando há', () => {
    expect(
      vendorDisplayName({
        nickname: 'Assaí',
        legalName: 'SENDAS DISTRIBUIDORA S/A',
      }),
    ).toBe('Assaí');
  });

  it('sem apelido, usa a razão social', () => {
    expect(
      vendorDisplayName({
        nickname: null,
        legalName: 'SENDAS DISTRIBUIDORA S/A',
      }),
    ).toBe('SENDAS DISTRIBUIDORA S/A');
  });
});
