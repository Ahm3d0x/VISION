import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check } from 'lucide-react';

interface FormattedResponseProps {
  content: string;
  className?: string;
}

export const FormattedResponse: React.FC<FormattedResponseProps> = ({ content, className = '' }) => {
  const isArabic = useMemo(() => {
    return /[\u0600-\u06FF]/.test(content);
  }, [content]);

  // Normalize model output: expand squashed math blocks, headers, and bullet lists
  const normalizedText = useMemo(() => {
    if (!content) return '';
    let text = content;

    // 1. Unindent display math blocks so markdown parsers don't treat them as indented code
    text = text.replace(/^[ \t]+\$\$/gm, '$$');

    // 2. Separate display math blocks ($$...$$) onto their own lines if cramped
    text = text.replace(/([^\n])\s*\$\$/g, '$1\n\n$$');
    text = text.replace(/\$\$\s*([^\n])/g, '$$\n\n$1');

    // 3. Separate inline bold headers like "**Calculation:**" or "**Result:**" onto new paragraphs
    text = text.replace(/([.?!:;])\s+(\*\*[A-Za-z0-9\u0600-\u06FF\s]+:\*\*)/g, '$1\n\n$2');

    // 4. Separate inline bullet points like "Where: - $ P = ... $ - $ N = 8 $"
    text = text.replace(/([^\n])\s+-\s+([A-Za-z0-9\$\u0600-\u06FF])/g, '$1\n- $2');

    // 5. Clean up any 3+ consecutive newlines to maximum of 2
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }, [content]);

  return (
    <div
      className={`formatted-response text-vision-text text-xs md:text-sm leading-relaxed font-sans ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-sans font-bold text-vision-cyan mt-3.5 mb-2 pb-1.5 border-b border-vision-border/60">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-sans font-bold text-vision-teal mt-3 mb-1.5 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-vision-teal"></span>
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs md:text-sm font-sans font-bold text-vision-cyan mt-2.5 mb-1.5 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan"></span>
              <span>{children}</span>
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-vision-text text-xs md:text-sm">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-vision-cyan">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-vision-text-secondary">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc list-outside pl-5 space-y-1 text-vision-text text-xs md:text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal list-outside pl-5 space-y-1 text-vision-text text-xs md:text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed marker:text-vision-cyan">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 pl-3 border-l-2 border-vision-cyan/50 italic text-vision-text-secondary bg-vision-surface/50 py-1 pr-2 rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded border border-vision-border" dir="ltr">
              <table className="w-full text-[11px] font-mono border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-vision-surface text-vision-cyan border-b border-vision-border font-bold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-vision-border/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-vision-panel/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="p-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-2 text-vision-text-secondary">
              {children}
            </td>
          ),
          code: ({ inline, className: codeClassName, children, ...props }: any) => {
            const isInline = inline || !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-vision-surface text-vision-cyan border border-vision-border/60 mx-0.5"
                  dir="ltr"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock code={codeString} className={codeClassName} />;
          },
        }}
      >
        {normalizedText}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; className?: string }> = ({ code, className }) => {
  const [copied, setCopied] = useState(false);
  const language = (className || '').replace(/language-/, '') || 'bash';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-vision-border/80 bg-[#06080E] font-mono text-xs" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1 bg-vision-panel/80 border-b border-vision-border/60 text-[10px] text-vision-text-muted">
        <span className="uppercase text-vision-cyan font-bold">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-vision-cyan transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-vision-success" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3 overflow-x-auto text-vision-text font-mono leading-relaxed">
        <pre className="m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
