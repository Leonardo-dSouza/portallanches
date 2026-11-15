/** Tags sem fechamento no HTML: não aprofundam. */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
/** O conteúdo delas é texto, não tag (um `<div>` dentro de um script não conta). */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);
const TAG_NAME = /^[a-z][a-z0-9-]*/;

interface TagStep {
  /** Onde a leitura continua. */
  end: number;
  /** Quanto a tag muda a profundidade: abre (+1), fecha (-1) ou nenhum dos dois. */
  delta: number;
}

/**
 * Profundidade máxima de tags abertas, numa passada só (2 MB em ~50 ms). Serve de barreira antes
 * do `node-html-parser`: com milhares de `<div>` sem fechar ele levava minutos e travava a API
 * (S-05 de 2026-11-15). Aproximada: só precisa separar uma página real (dezenas) de um ataque.
 *
 * @example measureNestingDepth('<div><p>a</p><br></div>') // 2
 */
export function measureNestingDepth(html: string): number {
  const lower = html.toLowerCase();
  let depth = 0;
  let deepest = 0;
  for (let at = lower.indexOf('<'); at !== -1;) {
    const step = readTag(lower, at);
    depth = Math.max(0, depth + step.delta);
    deepest = Math.max(deepest, depth);
    at = lower.indexOf('<', step.end);
  }
  return deepest;
}

function readTag(lower: string, at: number): TagStep {
  if (lower.startsWith('<!--', at))
    return { end: endOf(lower, '-->', at), delta: 0 };
  if (lower[at + 1] === '!' || lower[at + 1] === '?')
    return { end: endOf(lower, '>', at), delta: 0 };
  const closing = lower[at + 1] === '/';
  const nameStart = at + (closing ? 2 : 1);
  const name = TAG_NAME.exec(lower.slice(nameStart, nameStart + 40))?.[0];
  if (!name) return { end: at + 1, delta: 0 };
  const tagEnd = endOf(lower, '>', at);
  if (closing) return { end: tagEnd, delta: -1 };
  if (RAW_TEXT_TAGS.has(name))
    return { end: endOf(lower, `</${name}`, tagEnd), delta: 0 };
  const opens = !VOID_TAGS.has(name) && lower[tagEnd - 2] !== '/';
  return { end: tagEnd, delta: opens ? 1 : 0 };
}

/** Logo depois do marcador, ou o fim do texto se ele não aparecer. */
function endOf(lower: string, marker: string, from: number): number {
  const found = lower.indexOf(marker, from);
  return found === -1 ? lower.length : found + marker.length;
}
