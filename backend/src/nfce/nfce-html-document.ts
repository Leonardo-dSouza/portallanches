import { parse, type HTMLElement } from 'node-html-parser';

/**
 * Pedaço da página da SEFAZ visto pelo leitor da nota. Casca fina sobre o `node-html-parser`,
 * para trocar de biblioteca sem mexer no leitor.
 */
export interface NfceHtmlNode {
  /** Texto com as entidades lidas e os espaços/quebras juntados num espaço só. */
  readonly text: string;
  find(selector: string): NfceHtmlNode | null;
  findAll(selector: string): NfceHtmlNode[];
}

/**
 * Lê o HTML da consulta da NFC-e.
 *
 * @example parseNfceHtml(html).find('#u20')?.text // 'SENDAS DISTRIBUIDORA S/A'
 */
export function parseNfceHtml(html: string): NfceHtmlNode {
  return wrap(parse(html));
}

function wrap(element: HTMLElement): NfceHtmlNode {
  return {
    get text() {
      return element.text.replace(/\s+/g, ' ').trim();
    },
    find: (selector) => {
      const found = element.querySelector(selector);
      return found && wrap(found);
    },
    findAll: (selector) => element.querySelectorAll(selector).map(wrap),
  };
}
