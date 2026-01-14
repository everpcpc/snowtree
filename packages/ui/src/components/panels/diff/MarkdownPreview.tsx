import { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import './MarkdownPreview.css';
// Reuse existing markdown styles from timeline
import '../timeline/MessageStyles.css';

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
});

export interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }, [content]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Add click handler for links to open in external browser
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href && window.electron?.openExternal) {
          window.electron.openExternal(href).catch((error) => {
            console.error('Failed to open external URL:', error);
          });
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`st-markdown-preview markdown-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
