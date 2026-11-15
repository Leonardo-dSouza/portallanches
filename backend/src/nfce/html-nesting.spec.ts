import { measureNestingDepth } from './html-nesting.js';
import { nfcePageHtml, SAMPLE_PAGE } from './nfce-page.fixture.js';

describe('measureNestingDepth', () => {
  it('conta as tags abertas, não as vazias nem as que se fecham sozinhas', () => {
    expect(measureNestingDepth('<div><p>a</p><br><img src="x"/></div>')).toBe(
      2,
    );
    expect(measureNestingDepth('<div><span/><input></div>')).toBe(1);
  });

  it('ignora comentário, doctype e o conteúdo de script e style', () => {
    const html =
      '<!DOCTYPE html><!-- <div><div> --><script>if (a<b) "<div><div>"</script><style>a<b{}</style><div></div>';
    expect(measureNestingDepth(html)).toBe(1);
  });

  it('maiúsculas e texto com "<" solto não confundem', () => {
    expect(measureNestingDepth('<DIV><Div>1 < 2</div></DIV>')).toBe(2);
  });

  it('tags sem fechar acumulam', () => {
    expect(measureNestingDepth('<div>'.repeat(300))).toBe(300);
  });

  it('a página da nota tem poucos níveis', () => {
    expect(measureNestingDepth(nfcePageHtml(SAMPLE_PAGE))).toBeLessThan(30);
  });

  it('2 MB em uma passada só', () => {
    const start = performance.now();
    measureNestingDepth('<div>x</div>'.repeat(170_000));
    expect(performance.now() - start).toBeLessThan(500);
  });
});
