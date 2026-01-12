/**
 * Check if a file is a Markdown file based on its extension
 */
export function isMarkdownFile(filePath: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(filePath);
}
