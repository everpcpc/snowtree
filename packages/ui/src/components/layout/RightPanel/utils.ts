import type { FileChange } from '../types';
import type { TrackedFileEntry, TriState } from './types';
import { FILE_TYPE_INFO, type FileType } from './constants';
import type { CommitData } from './types';

export const compareGitPaths = (a: string, b: string): number =>
  a === b ? 0 : a < b ? -1 : 1;

export type HunksByPath = Record<string, number>;

export const getTypeInfo = (type: FileChange['type']) => {
  const key = type as FileType;
  return FILE_TYPE_INFO[key] || FILE_TYPE_INFO.modified;
};

export interface WorkingTree {
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: FileChange[];
}

export function countDiffHunksByPath(diffText: string | null | undefined): HunksByPath {
  if (!diffText) return {};

  const result: HunksByPath = {};
  const fileMatches = diffText.match(/diff --git[\s\S]*?(?=diff --git|$)/g);
  if (!fileMatches) return result;

  for (const fileContent of fileMatches) {
    const fileNameMatch = fileContent.match(/diff --git a\/(.*?) b\/(.*?)(?:\n|$)/);
    if (!fileNameMatch) continue;
    const path = fileNameMatch[2] || fileNameMatch[1] || '';
    if (!path) continue;

    const hunks = (fileContent.match(/^@@/gm) || []).length;
    result[path] = (result[path] || 0) + hunks;
  }

  return result;
}

export function sumHunksByPath(hunksByPath: HunksByPath): number {
  return Object.values(hunksByPath).reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
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

export function formatCommitHoverTitle(commit: CommitData): string {
  const isUncommitted = commit.id === 0;

  const message = (commit.commit_message || '').trim() || (isUncommitted ? 'Uncommitted changes' : 'Commit');
  const author = (commit.author || '').trim() || (isUncommitted ? 'You' : 'Unknown');
  const hash = (commit.after_commit_hash || '').trim();

  const date = (() => {
    const d = new Date(commit.timestamp);
    if (Number.isNaN(d.getTime())) return String(commit.timestamp || '');
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  })();

  const lines: string[] = [message, '', `Author: ${author}`, `Date: ${date}`];

  if (!isUncommitted && hash && hash !== 'UNCOMMITTED') lines.push(`Hash: ${hash}`);

  lines.push(
    `Changes: +${commit.stats_additions}  -${commit.stats_deletions}  (${commit.stats_files_changed} files)`
  );

  return lines.join('\n');
}
