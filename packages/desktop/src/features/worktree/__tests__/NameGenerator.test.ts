import { describe, expect, it } from 'vitest';
import { WorktreeNameGenerator } from '../NameGenerator';
import { ConfigManager } from '../configManager';

describe('WorktreeNameGenerator', () => {
  it('generates a branch-safe worktree name with random suffix', () => {
    const gen = new WorktreeNameGenerator(new ConfigManager());
    const name = gen.generateWorktreeNameFromSessionName('My Session!');
    expect(name).toMatch(/^my-session-w[0-9abcdefghjkmnpqrstvwxyz]{7}$/);
  });

  it('generateWorktreeName uses the same format', () => {
    const gen = new WorktreeNameGenerator(new ConfigManager());
    const name = gen.generateWorktreeName();
    expect(name).toMatch(/^[a-z0-9-]+-w[0-9abcdefghjkmnpqrstvwxyz]{7}$/);
  });
});
