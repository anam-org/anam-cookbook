import { createHighlighter, type Highlighter } from 'shiki';

// Use globalThis to cache across SSG workers
const globalForShiki = globalThis as typeof globalThis & {
  shikiHighlighter?: Highlighter;
  shikiPromise?: Promise<Highlighter>;
};

export async function getHighlighter(): Promise<Highlighter> {
  if (globalForShiki.shikiHighlighter) {
    return globalForShiki.shikiHighlighter;
  }

  if (!globalForShiki.shikiPromise) {
    globalForShiki.shikiPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'javascript', 'python', 'bash', 'json', 'html', 'css', 'mdx'],
    }).then((hl) => {
      globalForShiki.shikiHighlighter = hl;
      return hl;
    });
  }

  return globalForShiki.shikiPromise;
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang,
    theme: 'github-dark',
  });
}
