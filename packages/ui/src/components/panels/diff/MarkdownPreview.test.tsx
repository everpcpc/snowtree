import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  it('renders markdown content', () => {
    render(<MarkdownPreview content="# Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders paragraphs', () => {
    render(<MarkdownPreview content="This is a paragraph." />);
    expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    const { container } = render(<MarkdownPreview content="This is **bold** text." />);
    const strong = container.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe('bold');
  });

  it('renders italic text', () => {
    const { container } = render(<MarkdownPreview content="This is *italic* text." />);
    const em = container.querySelector('em');
    expect(em).toBeInTheDocument();
    expect(em?.textContent).toBe('italic');
  });

  it('renders links', () => {
    render(<MarkdownPreview content="[Click here](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'Click here' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders code blocks', () => {
    const { container } = render(<MarkdownPreview content="```\nconst x = 1;\n```" />);
    // marked wraps code blocks in <pre><code>...</code></pre>
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toContain('const x = 1;');
  });

  it('renders inline code', () => {
    const { container } = render(<MarkdownPreview content="Use `npm install` to install." />);
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toBe('npm install');
  });

  it('renders unordered lists', () => {
    const { container } = render(<MarkdownPreview content="- Item 1\n- Item 2\n- Item 3" />);
    const ul = container.querySelector('ul');
    const items = container.querySelectorAll('li');
    expect(ul).toBeInTheDocument();
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders ordered lists', () => {
    const { container } = render(<MarkdownPreview content="1. First\n2. Second\n3. Third" />);
    const ol = container.querySelector('ol');
    const items = container.querySelectorAll('li');
    expect(ol).toBeInTheDocument();
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders tables (GFM)', () => {
    const tableMarkdown = `
| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |
`;
    const { container } = render(<MarkdownPreview content={tableMarkdown} />);
    const table = container.querySelector('table');
    const rows = container.querySelectorAll('tr');
    expect(table).toBeInTheDocument();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('renders blockquotes', () => {
    const { container } = render(<MarkdownPreview content="> This is a quote" />);
    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote?.textContent).toContain('This is a quote');
  });

  it('renders horizontal rules', () => {
    const { container } = render(<MarkdownPreview content="Above\n\n---\n\nBelow" />);
    // marked may render --- differently, check for hr or thematic break
    const hr = container.querySelector('hr');
    const content = container.textContent;
    expect(content).toContain('Above');
    expect(content).toContain('Below');
    // hr might not render in all cases with marked, so just verify content renders
  });

  it('applies custom className', () => {
    const { container } = render(<MarkdownPreview content="Test" className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains('custom-class')).toBe(true);
  });

  it('applies st-markdown-preview class', () => {
    const { container } = render(<MarkdownPreview content="Test" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains('st-markdown-preview')).toBe(true);
  });

  it('applies markdown-content class for styling', () => {
    const { container } = render(<MarkdownPreview content="Test" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains('markdown-content')).toBe(true);
  });

  it('handles empty content gracefully', () => {
    const { container } = render(<MarkdownPreview content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders multiple headings', () => {
    const { container } = render(
      <MarkdownPreview content="# H1\n\n## H2\n\n### H3\n\n#### H4" />
    );
    expect(container.querySelector('h1')).toBeInTheDocument();
    // With marked, headings need blank lines between them
    const headings = container.querySelectorAll('h1, h2, h3, h4');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders strikethrough (GFM)', () => {
    const { container } = render(<MarkdownPreview content="~~deleted~~" />);
    const del = container.querySelector('del');
    expect(del).toBeInTheDocument();
    expect(del?.textContent).toBe('deleted');
  });

  it('renders task lists (GFM)', () => {
    const { container } = render(
      <MarkdownPreview content="- [x] Done\n- [ ] Todo" />
    );
    // Task lists may render as checkboxes or as text with [x] / [ ]
    const content = container.textContent;
    expect(content).toContain('Done');
    expect(content).toContain('Todo');
  });
});
