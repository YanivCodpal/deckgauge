interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
}

export function extractPlainText(adf: unknown): string | null {
  if (adf === null || adf === undefined) return null;
  if (typeof adf !== 'object') return null;

  const node = adf as AdfNode;
  if (node.type !== 'doc' || !Array.isArray(node.content)) return null;

  const lines: string[] = [];
  collectLines(node, lines);
  return lines.join('\n');
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

/**
 * Recursively walks an ADF node tree, appending text segments to `lines`.
 * Block-level nodes (paragraph, listItem, etc.) each start a new line.
 * hardBreak nodes insert an inline newline.
 */
function collectLines(node: AdfNode, lines: string[]): void {
  if (node.type === 'text') {
    if (!node.text) return;
    if (lines.length === 0) {
      lines.push(node.text);
    } else {
      lines[lines.length - 1] += node.text;
    }
    return;
  }

  if (node.type === 'hardBreak') {
    lines.push('');
    return;
  }

  if (!node.content) return;

  if (BLOCK_TYPES.has(node.type)) {
    // Only start a new line if the current last line already has content.
    // This prevents double-blank from nested block types (e.g. listItem > paragraph).
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
  }

  for (const child of node.content) {
    collectLines(child, lines);
  }
}
