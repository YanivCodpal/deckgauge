import { minimatch } from 'minimatch';

// minimatch v10 has no `nobracket` option, so `[abc]` is always parsed as a
// character class. Pre-escape brackets so they match literally — picker globs
// only need `*` and `?`.
function escapeBrackets(pattern: string): string {
  return pattern.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

export function matchesGlob(repoName: string, pattern: string): boolean {
  if (pattern === '') return true;
  return minimatch(repoName.toLowerCase(), escapeBrackets(pattern.toLowerCase()), {
    nocase: true,
    nobrace: true,
    noext: true,
    nocomment: true,
    noglobstar: true,
  });
}
