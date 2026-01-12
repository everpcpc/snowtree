import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineDiffViewer } from './InlineDiffViewer';

describe('InlineDiffViewer', () => {
  const oldString = `line 1
line 2
line 3`;

  const newString = `line 1
modified line 2
line 3
line 4`;

  it('renders the diff viewer', () => {
    const { container } = render(
      <InlineDiffViewer oldString={oldString} newString={newString} />
    );
    expect(container.querySelector('.inline-diff-viewer')).toBeInTheDocument();
  });

  it('displays file path in header when provided', () => {
    render(
      <InlineDiffViewer
        oldString={oldString}
        newString={newString}
        filePath="test.txt"
      />
    );
    expect(screen.getByText('test.txt')).toBeInTheDocument();
  });

  it('shows diff statistics', () => {
    render(
      <InlineDiffViewer
        oldString={oldString}
        newString={newString}
        filePath="test.txt"
      />
    );
    // Should show added and removed counts
    const stats = document.querySelector('.diff-stats');
    expect(stats).toBeInTheDocument();
  });

  it('renders added lines with insert class', () => {
    const { container } = render(
      <InlineDiffViewer oldString="old" newString="new" />
    );
    const insertLines = container.querySelectorAll('.diff-line-insert');
    expect(insertLines.length).toBeGreaterThan(0);
  });

  it('renders deleted lines with delete class', () => {
    const { container } = render(
      <InlineDiffViewer oldString="old" newString="new" />
    );
    const deleteLines = container.querySelectorAll('.diff-line-delete');
    expect(deleteLines.length).toBeGreaterThan(0);
  });

  it('renders context lines with context class', () => {
    const { container } = render(
      <InlineDiffViewer oldString={oldString} newString={newString} />
    );
    const contextLines = container.querySelectorAll('.diff-line-context');
    expect(contextLines.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <InlineDiffViewer
        oldString={oldString}
        newString={newString}
        className="custom-class"
      />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  describe('Markdown Preview', () => {
    it('shows preview button for markdown files', () => {
      render(
        <InlineDiffViewer
          oldString="# Old Title"
          newString="# New Title"
          filePath="README.md"
        />
      );
      const previewBtn = document.querySelector('.diff-preview-btn');
      expect(previewBtn).toBeInTheDocument();
    });

    it('does not show preview button for non-markdown files', () => {
      render(
        <InlineDiffViewer
          oldString="old"
          newString="new"
          filePath="file.txt"
        />
      );
      const previewBtn = document.querySelector('.diff-preview-btn');
      expect(previewBtn).not.toBeInTheDocument();
    });

    it('does not show preview button when filePath is not provided', () => {
      render(
        <InlineDiffViewer
          oldString="# Old"
          newString="# New"
        />
      );
      const previewBtn = document.querySelector('.diff-preview-btn');
      expect(previewBtn).not.toBeInTheDocument();
    });

    it('toggles to preview mode when clicking preview button', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <InlineDiffViewer
          oldString="# Old Title"
          newString="# New Title\n\nSome content"
          filePath="README.md"
        />
      );

      // Initially shows diff
      expect(container.querySelector('.diff-content')).toBeInTheDocument();
      expect(container.querySelector('.st-markdown-preview')).not.toBeInTheDocument();

      // Click preview button
      const previewBtn = document.querySelector('.diff-preview-btn') as HTMLButtonElement;
      await user.click(previewBtn);

      // Now shows preview
      expect(container.querySelector('.st-markdown-preview')).toBeInTheDocument();
    });

    it('renders new content in preview mode', async () => {
      const user = userEvent.setup();
      render(
        <InlineDiffViewer
          oldString="# Old"
          newString="# Hello World"
          filePath="test.md"
        />
      );

      const previewBtn = document.querySelector('.diff-preview-btn') as HTMLButtonElement;
      await user.click(previewBtn);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('toggles back to diff mode when clicking preview button again', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <InlineDiffViewer
          oldString="# Old"
          newString="# New"
          filePath="test.md"
        />
      );

      const previewBtn = document.querySelector('.diff-preview-btn') as HTMLButtonElement;

      // Toggle to preview
      await user.click(previewBtn);
      expect(container.querySelector('.st-markdown-preview')).toBeInTheDocument();

      // Toggle back to diff
      await user.click(previewBtn);
      expect(container.querySelector('.diff-content')).toBeInTheDocument();
      expect(container.querySelector('.st-markdown-preview')).not.toBeInTheDocument();
    });

    it('shows preview button for .mdx files', () => {
      render(
        <InlineDiffViewer
          oldString="old"
          newString="new"
          filePath="component.mdx"
        />
      );
      const previewBtn = document.querySelector('.diff-preview-btn');
      expect(previewBtn).toBeInTheDocument();
    });

    it('shows preview button for .markdown files', () => {
      render(
        <InlineDiffViewer
          oldString="old"
          newString="new"
          filePath="guide.markdown"
        />
      );
      const previewBtn = document.querySelector('.diff-preview-btn');
      expect(previewBtn).toBeInTheDocument();
    });
  });

  describe('Diff Algorithm', () => {
    it('correctly identifies unchanged lines', () => {
      const { container } = render(
        <InlineDiffViewer
          oldString={oldString}
          newString={newString}
        />
      );
      // oldString has "line 1" and "line 3" unchanged, so at least 2 context lines
      const contextLines = container.querySelectorAll('.diff-line-context');
      expect(contextLines.length).toBeGreaterThanOrEqual(2);
    });

    it('handles empty old string (new file)', () => {
      const { container } = render(
        <InlineDiffViewer
          oldString=""
          newString="new line 1\nnew line 2"
        />
      );
      const insertLines = container.querySelectorAll('.diff-line-insert');
      expect(insertLines.length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty new string (deleted file)', () => {
      const { container } = render(
        <InlineDiffViewer
          oldString="old line 1\nold line 2"
          newString=""
        />
      );
      const deleteLines = container.querySelectorAll('.diff-line-delete');
      expect(deleteLines.length).toBeGreaterThanOrEqual(1);
    });

    it('handles identical content', () => {
      const content = "line 1\nline 2\nline 3";
      const { container } = render(
        <InlineDiffViewer
          oldString={content}
          newString={content}
        />
      );
      const contextLines = container.querySelectorAll('.diff-line-context');
      const insertLines = container.querySelectorAll('.diff-line-insert');
      const deleteLines = container.querySelectorAll('.diff-line-delete');

      expect(contextLines).toHaveLength(3);
      expect(insertLines).toHaveLength(0);
      expect(deleteLines).toHaveLength(0);
    });
  });
});
