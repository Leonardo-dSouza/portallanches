import { parseNfceHtml } from './nfce-html-document.js';

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
