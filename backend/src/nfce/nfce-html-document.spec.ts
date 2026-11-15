import { UnprocessableEntityException } from '@nestjs/common';
import { parseNfceHtml } from './nfce-html-document.js';
import { nfcePageHtml, SAMPLE_PAGE } from './nfce-page.fixture.js';

describe('parseNfceHtml', () => {
  const html = `<div id="u20">  C&amp;A
      MODAS </div><table id="t"><tr id="Item + 1"><td><span class="a">1</span></td></tr>
      <tr id="Item + 2"><td><span class="a">2</span></td></tr></table>`;

  it('acha pelo seletor e devolve o texto sem quebras e com as entidades lidas', () => {
    expect(parseNfceHtml(html).find('#u20')?.text).toBe('C&A MODAS');
  });

  it('devolve null quando o seletor não acha nada', () => {
    expect(parseNfceHtml(html).find('#nada')).toBeNull();
  });

  it('lista todos os elementos do seletor, na ordem da página', () => {
    const rows = parseNfceHtml(html).findAll('#t tr[id^="Item"]');
    expect(rows.map((row) => row.find('.a')?.text)).toEqual(['1', '2']);
  });
});

describe('parseNfceHtml com HTML malformado (S-05)', () => {
  it('8.000 <div> abertas e nunca fechadas: 422 em menos de 200 ms', () => {
    const html = `<html><body>${'<div>x'.repeat(8000)}</body></html>`;
    const start = performance.now();
    expect(() => parseNfceHtml(html)).toThrow(UnprocessableEntityException);
    expect(performance.now() - start).toBeLessThan(200);
  });

  it('8.000 <li> soltas no mesmo nível ainda leem rápido', () => {
    const html = `<ul>${'<li>x</li>'.repeat(8000)}</ul>`;
    const start = performance.now();
    expect(parseNfceHtml(html).findAll('li')).toHaveLength(8000);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('a página da nota passa com folga', () => {
    expect(() => parseNfceHtml(nfcePageHtml(SAMPLE_PAGE))).not.toThrow();
  });
});
