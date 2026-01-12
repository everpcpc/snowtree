import { describe, it, expect } from 'vitest';
import { isMarkdownFile } from './fileUtils';

describe('isMarkdownFile', () => {
  it('returns true for .md files', () => {
    expect(isMarkdownFile('README.md')).toBe(true);
    expect(isMarkdownFile('docs/guide.md')).toBe(true);
    expect(isMarkdownFile('/path/to/file.md')).toBe(true);
  });

  it('returns true for .mdx files', () => {
    expect(isMarkdownFile('component.mdx')).toBe(true);
    expect(isMarkdownFile('docs/page.mdx')).toBe(true);
  });

  it('returns true for .markdown files', () => {
    expect(isMarkdownFile('README.markdown')).toBe(true);
    expect(isMarkdownFile('docs/guide.markdown')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isMarkdownFile('README.MD')).toBe(true);
    expect(isMarkdownFile('file.Md')).toBe(true);
    expect(isMarkdownFile('file.MDX')).toBe(true);
    expect(isMarkdownFile('file.MARKDOWN')).toBe(true);
  });

  it('returns false for non-markdown files', () => {
    expect(isMarkdownFile('file.txt')).toBe(false);
    expect(isMarkdownFile('file.js')).toBe(false);
    expect(isMarkdownFile('file.ts')).toBe(false);
    expect(isMarkdownFile('file.html')).toBe(false);
    expect(isMarkdownFile('file.css')).toBe(false);
    expect(isMarkdownFile('file.json')).toBe(false);
  });

  it('returns false for files with md in the name but different extension', () => {
    expect(isMarkdownFile('markdown.txt')).toBe(false);
    expect(isMarkdownFile('readme.md.bak')).toBe(false);
    expect(isMarkdownFile('md-file.js')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isMarkdownFile('')).toBe(false);
  });
});
