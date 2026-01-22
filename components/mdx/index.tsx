import type { MDXComponents } from 'mdx/types';
import { CodeBlockServer } from './CodeBlockServer';
import { Callout } from './Callout';
import { Steps } from './Steps';

export const mdxComponents: MDXComponents = {
  // Override default code blocks
  pre: ({ children, ...props }: React.ComponentProps<'pre'>) => {
    // Extract code element
    const codeElement = children as React.ReactElement<{
      children: string;
      className?: string;
    }>;

    if (codeElement?.props) {
      const code = codeElement.props.children?.toString() || '';
      const className = codeElement.props.className || '';
      const language = className.replace('language-', '') || 'text';

      return <CodeBlockServer code={code.trim()} language={language} />;
    }

    return <pre {...props}>{children}</pre>;
  },

  // Custom components
  Callout,
  Tip: (props: React.ComponentProps<typeof Callout>) => <Callout type="tip" {...props} />,
  Warning: (props: React.ComponentProps<typeof Callout>) => <Callout type="warning" {...props} />,
  Info: (props: React.ComponentProps<typeof Callout>) => <Callout type="info" {...props} />,
  Steps,
};
