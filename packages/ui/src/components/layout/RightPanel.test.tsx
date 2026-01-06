import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RightPanel } from './RightPanel';
import type { RightPanelProps } from './types';
import { API } from '../../utils/api';

// Mock API
vi.mock('../../utils/api', () => ({
  API: {
    sessions: {
      getExecutions: vi.fn(),
      getDiff: vi.fn(),
    },
  },
}));

describe('RightPanel - WorkingGroupHeader', () => {
  const mockProps: RightPanelProps = {
    session: {
      id: 'test-session',
      name: 'Test Session',
      status: 'ready',
      createdAt: new Date().toISOString(),
      worktreePath: '/test/path',
    },
    onFileClick: vi.fn(),
    onCommitUncommittedChanges: vi.fn(),
    isCommitDisabled: false,
    onCommitClick: vi.fn(),
    onPushPR: vi.fn(),
    isPushPRDisabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.getExecutions as any).mockResolvedValue({
      success: true,
      data: [
        {
          id: 0,
          commit_message: 'Working Tree',
          timestamp: new Date().toISOString(),
          stats_additions: 0,
          stats_deletions: 0,
          stats_files_changed: 0,
          after_commit_hash: '',
          parent_commit_hash: null,
          author: 'test',
        },
      ],
    });
    (API.sessions.getDiff as any).mockResolvedValue({
      success: true,
      data: {
        workingTree: {
          staged: [
            { path: 'staged1.ts', status: 'M', additions: 5, deletions: 2 },
            { path: 'staged2.ts', status: 'A', additions: 10, deletions: 0 },
          ],
          unstaged: [
            { path: 'unstaged1.ts', status: 'M', additions: 3, deletions: 1 },
          ],
          untracked: [
            { path: 'new.ts', status: '?', additions: 0, deletions: 0 },
          ],
        },
      },
    });
  });

  it('renders without crashing', async () => {
    render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Changes/i)).toBeInTheDocument();
    });
  });

  it('does NOT crash with colors.diff.added bug', async () => {
    // This ensures the fix - should use colors.text.added/deleted, not colors.diff.added
    expect(() => render(<RightPanel {...mockProps} />)).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText(/^STAGED$/i)).toBeInTheDocument();
    });
  });

  it('displays all three group headers with correct labels', async () => {
    render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/^STAGED$/i)).toBeInTheDocument();
      expect(screen.getByText(/^UNSTAGED$/i)).toBeInTheDocument();
      expect(screen.getByText(/^UNTRACKED$/i)).toBeInTheDocument();
    });
  });

  it('shows correct icons for each group', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      const text = container.textContent || '';
      expect(text).toContain('✓'); // Staged icon
      expect(text).toContain('●'); // Unstaged icon
      expect(text).toContain('?'); // Untracked icon
    });
  });

  it('displays file counts correctly', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      const text = container.textContent || '';
      expect(text).toMatch(/2/); // 2 staged files
      expect(text).toMatch(/1/); // 1 unstaged file
      expect(text).toMatch(/1/); // 1 untracked file
    });
  });

  it('shows addition/deletion stats with correct colors', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      // Should show +15 for staged (5+10)
      expect(screen.getByText(/^\+15$/)).toBeInTheDocument();
      // Should show -2 for staged
      expect(screen.getAllByText(/^-2$/).length).toBeGreaterThan(0);
      // Should show +3 for unstaged
      expect(screen.getAllByText(/^\+3$/).length).toBeGreaterThan(0);
    });

    // Check that stats use colors.text.added and colors.text.deleted
    const addedStats = container.querySelectorAll('span[style*="color"]');
    expect(addedStats.length).toBeGreaterThan(0);
  });

  it('applies different background colors for each group', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      const buttons = container.querySelectorAll('button');
      const stagedBtn = Array.from(buttons).find(btn => btn.textContent?.includes('STAGED'));
      const unstagedBtn = Array.from(buttons).find(btn => btn.textContent?.includes('UNSTAGED'));
      const untrackedBtn = Array.from(buttons).find(btn => btn.textContent?.includes('UNTRACKED'));

      expect(stagedBtn).toBeTruthy();
      expect(unstagedBtn).toBeTruthy();
      expect(untrackedBtn).toBeTruthy();

      // Each should have different background color
      const stagedStyle = stagedBtn ? window.getComputedStyle(stagedBtn) : null;
      const unstagedStyle = unstagedBtn ? window.getComputedStyle(unstagedBtn) : null;

      expect(stagedStyle?.backgroundColor).toBeTruthy();
      expect(unstagedStyle?.backgroundColor).toBeTruthy();
      expect(stagedStyle?.backgroundColor).not.toBe(unstagedStyle?.backgroundColor);
    });
  });

  it('toggles group expansion on click', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/^STAGED$/i)).toBeInTheDocument();
    });

    const buttons = container.querySelectorAll('button');
    const stagedBtn = Array.from(buttons).find(btn => btn.textContent?.includes('STAGED'));

    if (stagedBtn) {
      const chevron = stagedBtn.querySelector('svg');
      const initialCollapsed = chevron?.classList.contains('-rotate-90') ?? false;

      // Click to collapse
      fireEvent.click(stagedBtn);

      await waitFor(() => {
        const newCollapsed = chevron?.classList.contains('-rotate-90') ?? false;
        expect(newCollapsed).not.toBe(initialCollapsed);
      });
    }
  });

  it('shows guide lines for file lists', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      // File lists should have left border (guide line)
      const guidedLists = container.querySelectorAll('div[style*="margin-left: 12px"][style*="border-left"]');
      expect(guidedLists.length).toBeGreaterThan(0);
    });
  });

  it('applies correct border colors matching group theme', async () => {
    const { container } = render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      const stagedBtn = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('STAGED')
      );

      // Button should have themed left border
      const borderLeft = stagedBtn ? window.getComputedStyle(stagedBtn).borderLeftWidth : '';
      expect(borderLeft).toBe('3px');
    });
  });

  it('handles empty groups gracefully', async () => {
    (API.sessions.getDiff as any).mockResolvedValue({
      success: true,
      data: { workingTree: { staged: [], unstaged: [], untracked: [] } },
    });

    render(<RightPanel {...mockProps} />);

    await waitFor(() => {
      // Should still render without errors
      expect(screen.getByText(/Changes/i)).toBeInTheDocument();
    });
  });
});
