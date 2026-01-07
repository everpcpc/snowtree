import { describe, it, expect } from 'vitest';
import {
  compareGitPaths,
  getTypeInfo,
  computeTrackedFiles,
  computeUntrackedFiles,
  formatCommitTime,
} from './utils';
import type { FileChange } from '../types';
import { FILE_TYPE_INFO } from './constants';

describe('compareGitPaths', () => {
  it('returns 0 for equal paths', () => {
    expect(compareGitPaths('src/a.ts', 'src/a.ts')).toBe(0);
  });

  it('returns -1 when first path is lexically smaller', () => {
    expect(compareGitPaths('a.ts', 'b.ts')).toBe(-1);
    expect(compareGitPaths('.github/ci.yml', 'src/index.ts')).toBe(-1);
  });

  it('returns 1 when first path is lexically larger', () => {
    expect(compareGitPaths('z.ts', 'a.ts')).toBe(1);
    expect(compareGitPaths('src/index.ts', '.github/ci.yml')).toBe(1);
  });

  it('sorts paths in git-like codepoint order', () => {
    const paths = ['package.json', '.github/ci.yml', '_config.yml', 'src/a.ts'];
    paths.sort(compareGitPaths);
    expect(paths).toEqual(['.github/ci.yml', '_config.yml', 'package.json', 'src/a.ts']);
  });
});

describe('getTypeInfo', () => {
  it('returns correct info for added files', () => {
    const info = getTypeInfo('added');
    expect(info.label).toBe('A');
    expect(info.color).toBe(FILE_TYPE_INFO.added.color);
  });

  it('returns correct info for deleted files', () => {
    const info = getTypeInfo('deleted');
    expect(info.label).toBe('D');
  });

  it('returns correct info for modified files', () => {
    const info = getTypeInfo('modified');
    expect(info.label).toBe('M');
  });

  it('returns correct info for renamed files', () => {
    const info = getTypeInfo('renamed');
    expect(info.label).toBe('R');
  });

  it('returns modified info for unknown type', () => {
    const info = getTypeInfo('unknown' as FileChange['type']);
    expect(info.label).toBe('M');
  });
});

describe('computeTrackedFiles', () => {
  it('returns empty array for null workingTree', () => {
    expect(computeTrackedFiles(null)).toEqual([]);
  });

  it('returns empty array for empty workingTree', () => {
    const workingTree = { staged: [], unstaged: [], untracked: [] };
    expect(computeTrackedFiles(workingTree)).toEqual([]);
  });

  it('marks fully staged files as checked', () => {
    const workingTree = {
      staged: [{ path: 'a.ts', type: 'modified' as const, additions: 5, deletions: 2 }],
      unstaged: [],
      untracked: [],
    };
    const result = computeTrackedFiles(workingTree);
    expect(result).toHaveLength(1);
    expect(result[0].stageState).toBe('checked');
    expect(result[0].file.path).toBe('a.ts');
  });

  it('marks unstaged files as unchecked', () => {
    const workingTree = {
      staged: [],
      unstaged: [{ path: 'b.ts', type: 'modified' as const, additions: 3, deletions: 1 }],
      untracked: [],
    };
    const result = computeTrackedFiles(workingTree);
    expect(result).toHaveLength(1);
    expect(result[0].stageState).toBe('unchecked');
  });

  it('marks partially staged files as indeterminate', () => {
    const workingTree = {
      staged: [{ path: 'c.ts', type: 'modified' as const, additions: 2, deletions: 1 }],
      unstaged: [{ path: 'c.ts', type: 'modified' as const, additions: 3, deletions: 2 }],
      untracked: [],
    };
    const result = computeTrackedFiles(workingTree);
    expect(result).toHaveLength(1);
    expect(result[0].stageState).toBe('indeterminate');
    expect(result[0].file.additions).toBe(5);
    expect(result[0].file.deletions).toBe(3);
  });

  it('sorts files by path', () => {
    const workingTree = {
      staged: [
        { path: 'z.ts', type: 'modified' as const, additions: 1, deletions: 0 },
        { path: 'a.ts', type: 'modified' as const, additions: 1, deletions: 0 },
      ],
      unstaged: [],
      untracked: [],
    };
    const result = computeTrackedFiles(workingTree);
    expect(result[0].file.path).toBe('a.ts');
    expect(result[1].file.path).toBe('z.ts');
  });
});

describe('computeUntrackedFiles', () => {
  it('returns empty array for null workingTree', () => {
    expect(computeUntrackedFiles(null, [])).toEqual([]);
  });

  it('returns untracked files from workingTree', () => {
    const workingTree = {
      staged: [],
      unstaged: [],
      untracked: [{ path: 'new.ts', type: 'added' as const, additions: 10, deletions: 0 }],
    };
    const result = computeUntrackedFiles(workingTree, []);
    expect(result).toHaveLength(1);
    expect(result[0].file.path).toBe('new.ts');
    expect(result[0].stageState).toBe('unchecked');
  });

  it('includes isNew files from trackedFiles', () => {
    const workingTree = {
      staged: [],
      unstaged: [],
      untracked: [],
    };
    const trackedFiles = [
      {
        file: { path: 'new-staged.ts', type: 'added' as const, additions: 5, deletions: 0, isNew: true },
        stageState: 'checked' as const,
      },
    ];
    const result = computeUntrackedFiles(workingTree, trackedFiles);
    expect(result).toHaveLength(1);
    expect(result[0].file.path).toBe('new-staged.ts');
  });

  it('deduplicates files by path', () => {
    const workingTree = {
      staged: [],
      unstaged: [],
      untracked: [{ path: 'dup.ts', type: 'added' as const, additions: 1, deletions: 0 }],
    };
    const trackedFiles = [
      {
        file: { path: 'dup.ts', type: 'added' as const, additions: 2, deletions: 0, isNew: true },
        stageState: 'checked' as const,
      },
    ];
    const result = computeUntrackedFiles(workingTree, trackedFiles);
    expect(result).toHaveLength(1);
  });
});

describe('formatCommitTime', () => {
  it('formats time for today', () => {
    const now = new Date();
    const result = formatCommitTime(now.toISOString());
    expect(result).toMatch(/^\d{1,2}:\d{2}/);
  });

  it('formats date for past days', () => {
    const pastDate = new Date('2025-01-01T10:00:00Z');
    const result = formatCommitTime(pastDate.toISOString());
    expect(result).toMatch(/\d{2,4}[/\-\.]\d{2}[/\-\.]\d{2,4}/);
  });
});
