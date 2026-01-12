import { useMemo } from 'react';
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

  return (
    <div
      className={`st-markdown-preview markdown-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
