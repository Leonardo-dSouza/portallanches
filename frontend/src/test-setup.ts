import '@testing-library/jest-dom/vitest';

// O jsdom não tem o showModal/close do <dialog> (o pop-up do pedido, 2026-10-10, usa os
// dois): o mínimo é abrir/fechar pelo atributo e avisar o "close".
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
