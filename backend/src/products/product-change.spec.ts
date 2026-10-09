import { planProductChange, type TrackedProduct } from './product-change.js';

const TODAY = '2026-10-10';

const X_SALADA: TrackedProduct = {
  salePrice: '17.80',
  active: true,
  deactivatedOn: null,
};

describe('planProductChange', () => {
  it('preço novo guarda o antigo valendo até ontem', () => {
    const plan = planProductChange(X_SALADA, { salePrice: '19.90' }, TODAY);
    expect(plan.superseded).toEqual({
      salePrice: '17.80',
      validUntil: '2026-10-09',
    });
  });

  it('mesmo preço em outra grafia não guarda nada', () => {
    const plan = planProductChange(X_SALADA, { salePrice: '17.8' }, TODAY);
    expect(plan.superseded).toBeNull();
  });

  it('sem preço no envio (só o ativo) não guarda nada', () => {
    const plan = planProductChange(X_SALADA, { active: true }, TODAY);
    expect(plan.superseded).toBeNull();
  });

  it('produto que não tinha preço não guarda nada', () => {
    const before = { ...X_SALADA, salePrice: null };
    const plan = planProductChange(before, { salePrice: '19.90' }, TODAY);
    expect(plan.superseded).toBeNull();
  });

  it('tirar o preço guarda o antigo', () => {
    const plan = planProductChange(X_SALADA, { salePrice: null }, TODAY);
    expect(plan.superseded?.salePrice).toBe('17.80');
  });

  it('desativar grava o dia da saída', () => {
    const plan = planProductChange(X_SALADA, { active: false }, TODAY);
    expect(plan.deactivatedOn).toBe(TODAY);
  });

  it('item já inativo mantém o dia em que saiu', () => {
    const before = { ...X_SALADA, active: false, deactivatedOn: '2026-10-01' };
    const plan = planProductChange(before, { active: false }, TODAY);
    expect(plan.deactivatedOn).toBe('2026-10-01');
  });

  it('reativar limpa o dia da saída', () => {
    const before = { ...X_SALADA, active: false, deactivatedOn: '2026-10-01' };
    const plan = planProductChange(before, { active: true }, TODAY);
    expect(plan.deactivatedOn).toBeNull();
  });

  it('sem o ativo no envio mantém o dia da saída', () => {
    const before = { ...X_SALADA, active: false, deactivatedOn: '2026-10-01' };
    const plan = planProductChange(before, { salePrice: '17.80' }, TODAY);
    expect(plan.deactivatedOn).toBe('2026-10-01');
  });
});
