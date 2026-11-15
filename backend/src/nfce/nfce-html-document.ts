import { UnprocessableEntityException } from '@nestjs/common';
import { parse, type HTMLElement } from 'node-html-parser';
import { measureNestingDepth } from './html-nesting.js';

/** A página real da nota tem poucas dezenas de níveis; 256 sobra. */
const MAX_NESTING_DEPTH = 256;

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
 * Lê o HTML da consulta da NFC-e. Desde 2026-11-15 (S-05) recusa aninhamento absurdo e deixa as
 * tags sem fechar como estão (`parseNoneClosedTags`): o conserto delas no fim da leitura era
 * quadrático, e 8.000 `<div>` abertas seguravam a API por mais de um minuto.
 *
 * @example parseNfceHtml(html).find('#u20')?.text // 'SENDAS DISTRIBUIDORA S/A'
 */
export function parseNfceHtml(html: string): NfceHtmlNode {
  const depth = measureNestingDepth(html);
  if (depth > MAX_NESTING_DEPTH)
    throw new UnprocessableEntityException(
      `Esse arquivo não é a página da nota: tags aninhadas em ${depth} níveis, esperado até ${MAX_NESTING_DEPTH}`,
    );
  return wrap(parse(html, { parseNoneClosedTags: true }));
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
