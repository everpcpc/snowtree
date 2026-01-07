import type { FileChange } from '../types';
import type { TrackedFileEntry, TriState } from './types';
import { FILE_TYPE_INFO, type FileType } from './constants';

export const compareGitPaths = (a: string, b: string): number =>
  a === b ? 0 : a < b ? -1 : 1;

export const getTypeInfo = (type: FileChange['type']) => {
  const key = type as FileType;
  return FILE_TYPE_INFO[key] || FILE_TYPE_INFO.modified;
};

export interface WorkingTree {
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: FileChange[];
}

export function computeTrackedFiles(
  workingTree: WorkingTree | null
): TrackedFileEntry[] {
  if (!workingTree) return [];

  const map = new Map<string, { staged?: FileChange; unstaged?: FileChange }>();
  for (const f of workingTree.staged) {
    map.set(f.path, { ...(map.get(f.path) || {}), staged: f });
  }
  for (const f of workingTree.unstaged) {
    map.set(f.path, { ...(map.get(f.path) || {}), unstaged: f });
  }

  const merged: TrackedFileEntry[] = [];
  for (const [path, entry] of map.entries()) {
    const staged = entry.staged;
    const unstaged = entry.unstaged;
    const type = unstaged?.type ?? staged?.type ?? 'modified';
    const additions = (staged?.additions || 0) + (unstaged?.additions || 0);
    const deletions = (staged?.deletions || 0) + (unstaged?.deletions || 0);
    const stageState: TriState =
      staged && unstaged ? 'indeterminate' : staged ? 'checked' : 'unchecked';
    const isNew = Boolean(staged?.isNew);
    merged.push({ file: { path, type, additions, deletions, isNew }, stageState });
  }

  merged.sort((a, b) => compareGitPaths(a.file.path, b.file.path));
  return merged;
}

export function computeUntrackedFiles(
  workingTree: WorkingTree | null,
  trackedFiles: TrackedFileEntry[]
): TrackedFileEntry[] {
  if (!workingTree) return [];

  const fromMap = trackedFiles.filter((x) => x.file.isNew);
  const fromStatus = workingTree.untracked.map((f) => ({
    file: f,
    stageState: 'unchecked' as TriState,
  }));

  const byPath = new Map<string, TrackedFileEntry>();
  for (const x of [...fromStatus, ...fromMap]) {
    byPath.set(x.file.path, x);
  }

  return Array.from(byPath.values()).sort((a, b) =>
    compareGitPaths(a.file.path, b.file.path)
  );
}

export function formatCommitTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
