import { highlightCode } from '@/lib/shiki';
import { CodeBlock } from '../CodeBlock';

interface CodeBlockServerProps {
  code: string;
  language: string;
  filename?: string;
}

export async function CodeBlockServer({ code, language, filename }: CodeBlockServerProps) {
  const highlightedHtml = await highlightCode(code, language);

  return (
    <CodeBlock
      code={code}
      language={language}
      highlightedHtml={highlightedHtml}
      filename={filename}
    />
  );
}
