import { describe, it, expect, vi } from 'vitest';
import { GitDiffManager } from '../DiffManager';

describe('GitDiffManager - new file detection', () => {
  it('does not throw when HEAD:path is missing for staged added file', async () => {
    const gitExecutor = {
      run: vi.fn(),
    } as any;

    const manager = new GitDiffManager(gitExecutor);

    // status-groups (porcelain) => staged added file
    vi.mocked(gitExecutor.run).mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'A  dd.txt\n',
      stderr: '',
    });

    // numstat-staged
    vi.mocked(gitExecutor.run).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '1\t0\tdd.txt\n',
      stderr: '',
    });

    // numstat-unstaged
    vi.mocked(gitExecutor.run).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    // cat-file-exists HEAD:dd.txt should fail but must not throw
    vi.mocked(gitExecutor.run).mockResolvedValueOnce({
      exitCode: 128,
      stdout: '',
      stderr: "fatal: path 'dd.txt' exists on disk, but not in 'HEAD'\n",
    });

    const groups = await manager.getWorkingTreeGroups('/repo', 's1');
    expect(groups.staged).toHaveLength(1);
    expect(groups.staged[0]).toMatchObject({ path: 'dd.txt', type: 'added', isNew: true });
  });
});

