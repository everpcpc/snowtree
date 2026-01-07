/**
 * Design tokens for RightPanel components.
 * Uses CSS custom properties defined in index.css for theme compatibility.
 */

export type ColorScheme = {
  bg: { primary: string; secondary: string; hover: string; selected: string };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    added: string;
    deleted: string;
    modified: string;
    renamed: string;
  };
  accent: string;
  border: string;
};

export const colors: ColorScheme = {
  bg: {
    primary: 'var(--st-bg)',
    secondary: 'var(--st-surface)',
    hover: 'var(--st-hover)',
    selected: 'var(--st-selected)',
  },
  text: {
    primary: 'var(--st-text)',
    secondary: 'var(--st-text-muted)',
    muted: 'var(--st-text-faint)',
    added: 'var(--st-success)',
    deleted: 'var(--st-danger)',
    modified: 'var(--st-warning)',
    renamed: 'var(--st-accent)',
  },
  accent: 'var(--st-accent)',
  border: 'var(--st-border-variant)',
};

export const stack = {
  line: 'color-mix(in srgb, var(--st-text-faint) 55%, transparent)',
  arrow: 'color-mix(in srgb, var(--st-text-faint) 82%, transparent)',
  lineAccent: 'color-mix(in srgb, var(--st-accent) 55%, transparent)',
  arrowAccent: 'color-mix(in srgb, var(--st-accent) 82%, transparent)',
};

/**
 * File type visual indicators using CSS variables for theme compatibility.
 */
export const FILE_TYPE_INFO = {
  added: {
    label: 'A',
    color: 'var(--st-success)',
    bg: 'color-mix(in srgb, var(--st-success) 15%, transparent)',
  },
  deleted: {
    label: 'D',
    color: 'var(--st-danger)',
    bg: 'color-mix(in srgb, var(--st-danger) 15%, transparent)',
  },
  renamed: {
    label: 'R',
    color: 'var(--st-accent)',
    bg: 'color-mix(in srgb, var(--st-accent) 15%, transparent)',
  },
  modified: {
    label: 'M',
    color: 'var(--st-warning)',
    bg: 'color-mix(in srgb, var(--st-warning) 15%, transparent)',
  },
} as const;

export type FileType = keyof typeof FILE_TYPE_INFO;
