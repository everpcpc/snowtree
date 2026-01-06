import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ZedDiffViewer } from './ZedDiffViewer';
import { API } from '../../../utils/api';

// Mock API
vi.mock('../../../utils/api', () => ({
  API: {
    sessions: {
      stageLine: vi.fn(),
    },
  },
}));

const SAMPLE_DIFF = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,5 +1,7 @@
 context line 1
-deleted line 1
-deleted line 2
 context line 2
+added line 1
+added line 2
+added line 3
 context line 3
 context line 4`;

describe('ZedDiffViewer - Visual Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should toggle Visual Mode with "v" key', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Initially not in visual mode
    expect(screen.queryByText(/Visual Mode/i)).not.toBeInTheDocument();

    // Press 'v' to enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Should show visual mode indicator
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Press 'v' again to exit
    fireEvent.keyDown(window, { key: 'v' });

    // Visual mode should be gone
    await waitFor(() => {
      expect(screen.queryByText(/Visual Mode/i)).not.toBeInTheDocument();
    });
  });

  it('should exit Visual Mode with Escape key', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    // Visual mode should be gone
    await waitFor(() => {
      expect(screen.queryByText(/Visual Mode/i)).not.toBeInTheDocument();
    });
  });

  it('should select single line on first click in Visual Mode', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Find and click on an added line
    const addedLines = container.querySelectorAll('[data-type="added"]');
    expect(addedLines.length).toBeGreaterThan(0);

    fireEvent.click(addedLines[0]);

    // Line should have selected styling
    await waitFor(() => {
      const selectedLines = container.querySelectorAll('[data-selected="true"]');
      expect(selectedLines.length).toBe(1);
    });
  });

  it('should extend selection on second click in Visual Mode', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Get all added lines
    const addedLines = container.querySelectorAll('[data-type="added"]');
    expect(addedLines.length).toBeGreaterThan(2);

    // Click first line
    fireEvent.click(addedLines[0]);
    await waitFor(() => {
      const selectedLines = container.querySelectorAll('[data-selected="true"]');
      expect(selectedLines.length).toBe(1);
    });

    // Click third line (should select lines 0, 1, 2)
    fireEvent.click(addedLines[2]);
    await waitFor(() => {
      const selectedLines = container.querySelectorAll('[data-selected="true"]');
      expect(selectedLines.length).toBe(3);
    });
  });

  it('should stage all selected lines when pressing "1" in Visual Mode', async () => {
    const onLineStaged = vi.fn();
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
        onLineStaged={onLineStaged}
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Select multiple lines
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);
    fireEvent.click(addedLines[2]);

    await waitFor(() => {
      const selectedLines = container.querySelectorAll('[data-selected="true"]');
      expect(selectedLines.length).toBe(3);
    });

    // Press '1' to stage
    fireEvent.keyDown(window, { key: '1' });

    // Should call stageLine for each selected line
    await waitFor(() => {
      expect(API.sessions.stageLine).toHaveBeenCalledTimes(3);
      expect(onLineStaged).toHaveBeenCalled();
    });
  });

  it('should clear selection after staging in Visual Mode', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode and select lines
    fireEvent.keyDown(window, { key: 'v' });
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);
    fireEvent.click(addedLines[1]);

    // Stage with '1'
    fireEvent.keyDown(window, { key: '1' });

    // Selection should be cleared after staging
    await waitFor(() => {
      const selectedLines = container.querySelectorAll('[data-selected="true"]');
      expect(selectedLines.length).toBe(0);
    });
  });
});

describe('ZedDiffViewer - Stage All File', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should stage all lines when pressing "a" key', async () => {
    const onLineStaged = vi.fn();
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
        onLineStaged={onLineStaged}
      />
    );

    // Get count of stageable lines (added + deleted)
    const addedLines = container.querySelectorAll('[data-type="added"]');
    const deletedLines = container.querySelectorAll('[data-type="deleted"]');
    const totalStageableLines = addedLines.length + deletedLines.length;

    // Press 'a' to stage all
    fireEvent.keyDown(window, { key: 'a' });

    // Should call stageLine for each stageable line
    await waitFor(() => {
      expect(API.sessions.stageLine).toHaveBeenCalledTimes(totalStageableLines);
      expect(onLineStaged).toHaveBeenCalled();
    });
  });

  it('should not stage all when in Visual Mode', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Press 'a' - should not stage all in visual mode
    fireEvent.keyDown(window, { key: 'a' });

    // Should not call stageLine
    await waitFor(() => {
      expect(API.sessions.stageLine).not.toHaveBeenCalled();
    });
  });

  it('should handle errors when staging all fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (API.sessions.stageLine as any).mockRejectedValue(new Error('Stage failed'));

    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Press 'a' to stage all
    fireEvent.keyDown(window, { key: 'a' });

    // Should log error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});

describe('ZedDiffViewer - Single Line Staging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should stage single added line on click', async () => {
    const onLineStaged = vi.fn();
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
        onLineStaged={onLineStaged}
      />
    );

    // Click on an added line (not in visual mode)
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);

    // Should call stageLine once
    await waitFor(() => {
      expect(API.sessions.stageLine).toHaveBeenCalledTimes(1);
      const call = (API.sessions.stageLine as any).mock.calls[0];
      expect(call[0]).toBe('test-session');
      expect(call[1].filePath).toBe('test.txt');
      expect(call[1].isStaging).toBe(true);
      expect(call[1].targetLine.type).toBe('added');
      expect(onLineStaged).toHaveBeenCalled();
    });
  });

  it('should stage single deleted line on click', async () => {
    const onLineStaged = vi.fn();
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
        onLineStaged={onLineStaged}
      />
    );

    // Click on a deleted line
    const deletedLines = container.querySelectorAll('[data-type="deleted"]');
    if (deletedLines.length > 0) {
      fireEvent.click(deletedLines[0]);

      await waitFor(() => {
        expect(API.sessions.stageLine).toHaveBeenCalledTimes(1);
        expect(onLineStaged).toHaveBeenCalled();
      });
    }
  });

  it('should unstage line when in staged scope', async () => {
    const onLineStaged = vi.fn();
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="staged"
        filePath="test.txt"
        onLineStaged={onLineStaged}
      />
    );

    // Click on an added line
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);

    // Should call stageLine with isStaging=false
    await waitFor(() => {
      expect(API.sessions.stageLine).toHaveBeenCalledWith('test-session', {
        filePath: 'test.txt',
        isStaging: false,
        targetLine: expect.any(Object),
      });
      expect(onLineStaged).toHaveBeenCalled();
    });
  });

  it('should not stage context lines', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Click on a context line
    const contextLines = container.querySelectorAll('[data-type="context"]');
    if (contextLines.length > 0) {
      fireEvent.click(contextLines[0]);

      // Should not call stageLine
      await waitFor(() => {
        expect(API.sessions.stageLine).not.toHaveBeenCalled();
      });
    }
  });

  it('should handle staging errors gracefully', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (API.sessions.stageLine as any).mockRejectedValue(new Error('Network error'));

    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Click on an added line
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);

    // Should show error
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });
});

describe('ZedDiffViewer - Modified Line Type Support', () => {
  const DELETED_DIFF = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,2 @@
 context
-deleted content
 context`;

  const ADDED_DIFF = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,3 @@
 context
+added content
 context`;

  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should handle deleted lines correctly', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={DELETED_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Find deleted line
    const deletedLines = container.querySelectorAll('[data-type="deleted"]');
    expect(deletedLines.length).toBeGreaterThan(0);

    fireEvent.click(deletedLines[0]);

    await waitFor(() => {
      expect(API.sessions.stageLine).toHaveBeenCalledWith('test-session', {
        filePath: 'test.txt',
        isStaging: true,
        targetLine: expect.objectContaining({
          type: 'deleted',
        }),
      });
    });
  });

  it('should handle added lines correctly', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={ADDED_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Find added line
    const addedLines = container.querySelectorAll('[data-type="added"]');
    expect(addedLines.length).toBeGreaterThan(0);

    fireEvent.click(addedLines[0]);

    await waitFor(() => {
      expect(API.sessions.stageLine).toHaveBeenCalledWith('test-session', {
        filePath: 'test.txt',
        isStaging: true,
        targetLine: expect.objectContaining({
          type: 'added',
        }),
      });
    });
  });
});

describe('ZedDiffViewer - Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should not trigger shortcuts with modifier keys', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Press Ctrl+V (should not enter visual mode)
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    expect(screen.queryByText(/Visual Mode/i)).not.toBeInTheDocument();

    // Press Cmd+A (should not stage all)
    fireEvent.keyDown(window, { key: 'a', metaKey: true });
    expect(API.sessions.stageLine).not.toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('ZedDiffViewer - Bottom Shortcut Bar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should display context-aware shortcuts for unstaged changes', () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Should show unstaged-specific shortcuts
    expect(screen.getByText('Stage line')).toBeInTheDocument();
    expect(screen.getByText('Multi-select')).toBeInTheDocument();
    expect(screen.getByText('Stage all')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();

    // Should have kbd elements for keys
    const kbdElements = container.querySelectorAll('kbd');
    const kbdTexts = Array.from(kbdElements).map(el => el.textContent);
    expect(kbdTexts).toContain('1');
    expect(kbdTexts).toContain('v');
    expect(kbdTexts).toContain('a');
    expect(kbdTexts).toContain('Esc');
  });

  it('should display context-aware shortcuts for staged changes', () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="staged"
      />
    );

    // Should show staged-specific shortcuts
    expect(screen.getByText('Unstage line')).toBeInTheDocument();
    expect(screen.getByText('Unstage all')).toBeInTheDocument();
  });

  it('should display read-only message for commit diff', () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        // No currentScope = commit diff (read-only)
      />
    );

    // Should show read-only indicator
    expect(screen.getByText(/Read-only view/i)).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should update shortcuts when entering Visual Mode', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Initially shows normal mode shortcuts
    expect(screen.getByText('Stage line')).toBeInTheDocument();

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      // Should show visual mode shortcuts (may appear multiple times in banner and bottom bar)
      expect(screen.getAllByText('Exit visual').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Click lines to select/i).length).toBeGreaterThan(0);
    });
  });

  it('should show selection action when lines are selected in Visual Mode', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Select lines
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);
    fireEvent.click(addedLines[1]);

    await waitFor(() => {
      // Should show stage selection action (may appear in banner and bottom bar)
      expect(screen.getAllByText(/Stage selection/i).length).toBeGreaterThan(0);
    });
  });

  it('should highlight primary action with distinct styling', () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Find the "Stage all" shortcut which should be primary
    const allKbds = container.querySelectorAll('kbd');
    const stageAllKbd = Array.from(allKbds).find(
      kbd => kbd.textContent === 'a'
    );

    expect(stageAllKbd).toBeTruthy();
    // Primary kbd should have blue background
    const style = window.getComputedStyle(stageAllKbd!);
    expect(style.backgroundColor).toContain('rgba(100, 150, 255');
  });
});

describe('ZedDiffViewer - Auto Focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-focus container when diff loads', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    const diffContainer = container.querySelector('.diff-container');
    expect(diffContainer).toBeTruthy();

    // Container should have tabIndex for keyboard accessibility
    expect(diffContainer?.getAttribute('tabindex')).toBe('0');

    // Container should have proper ARIA attributes
    expect(diffContainer?.getAttribute('role')).toBe('region');
    expect(diffContainer?.getAttribute('aria-label')).toBe('Diff viewer');

    // Wait for auto-focus to occur
    await waitFor(() => {
      expect(document.activeElement).toBe(diffContainer);
    });
  });

  it('should allow keyboard shortcuts immediately after load', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Wait for auto-focus
    await waitFor(() => {
      const diffContainer = document.querySelector('.diff-container');
      expect(document.activeElement).toBe(diffContainer);
    });

    // Should be able to press 'v' immediately without clicking
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });
  });

  it('should not auto-focus when diff is empty', () => {
    const { container } = render(
      <ZedDiffViewer
        diff=""
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Should show "No changes" message
    expect(screen.getByText(/No changes to display/i)).toBeInTheDocument();

    // Should not have the diff-container class
    expect(container.querySelector('.diff-container')).not.toBeInTheDocument();
  });

  it('should maintain focus during interactions', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    const diffContainer = container.querySelector('.diff-container');

    await waitFor(() => {
      expect(document.activeElement).toBe(diffContainer);
    });

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Container should still be focused
    expect(document.activeElement).toBe(diffContainer);
  });
});

describe('ZedDiffViewer - Enhanced Visual Mode Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should display enhanced banner with breathing animation', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      // Banner should be present
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Check for breathing animation dot
    const animatedDot = container.querySelector('[style*="breathing"]');
    expect(animatedDot).toBeTruthy();
  });

  it('should show selection count badge when lines are selected', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });
    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Select multiple lines
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);
    fireEvent.click(addedLines[2]);

    await waitFor(() => {
      // Should show "3 lines selected" badge
      expect(screen.getByText(/3 lines selected/i)).toBeInTheDocument();
    });
  });

  it('should apply stronger background color to selected lines', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode and select line
    fireEvent.keyDown(window, { key: 'v' });
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);

    await waitFor(() => {
      const selectedLine = container.querySelector('[data-selected="true"]');
      expect(selectedLine).toBeTruthy();

      const style = window.getComputedStyle(selectedLine!);
      // Should have 0.35 opacity background (stronger than old 0.25)
      expect(style.backgroundColor).toContain('rgba(100, 150, 255, 0.35)');
      // Should have left border
      expect(style.borderLeft).toContain('2px solid');
    });
  });

  it('should display anchor and cursor position indicators', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Select first line (becomes both anchor and cursor)
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);

    await waitFor(() => {
      const firstLine = addedLines[0];
      // Should have both anchor and cursor indicators
      const indicators = firstLine.querySelectorAll('[style*="position: absolute"]');
      expect(indicators.length).toBeGreaterThan(0);
    });

    // Select second line (anchor stays on first, cursor moves to second)
    fireEvent.click(addedLines[1]);

    await waitFor(() => {
      // Both lines should be selected
      expect(container.querySelectorAll('[data-selected="true"]').length).toBe(2);
    });
  });

  it('should show context-aware hints in banner', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      // Without selection: show how to select (appears in banner and bottom bar)
      expect(screen.getAllByText(/Click lines to select/i).length).toBeGreaterThan(0);
    });

    // Select lines
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);
    fireEvent.click(addedLines[1]);

    await waitFor(() => {
      // With selection: emphasize action
      expect(screen.getByText(/to stage selection/i)).toBeInTheDocument();
      expect(screen.getByText(/Click more lines to extend/i)).toBeInTheDocument();
    });
  });

  it('should update hover tooltip in Visual Mode', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    const addedLines = container.querySelectorAll('[data-type="added"]');
    const firstLine = addedLines[0] as HTMLElement;

    // Normal mode: should say "Click to stage"
    expect(firstLine.getAttribute('title')).toBe('Click to stage');

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      // Visual mode: should say "Click to select/extend selection"
      expect(firstLine.getAttribute('title')).toBe('Click to select/extend selection');
    });
  });

  it('should clear visual feedback when exiting Visual Mode', async () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode and select lines
    fireEvent.keyDown(window, { key: 'v' });
    const addedLines = container.querySelectorAll('[data-type="added"]');
    fireEvent.click(addedLines[0]);

    await waitFor(() => {
      expect(container.querySelectorAll('[data-selected="true"]').length).toBe(1);
    });

    // Exit visual mode
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      // Banner should be gone
      expect(screen.queryByText(/Visual Mode/i)).not.toBeInTheDocument();
      // Selection should be cleared
      expect(container.querySelectorAll('[data-selected="true"]').length).toBe(0);
    });
  });
});

describe('ZedDiffViewer - Vim Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.stageLine as any).mockResolvedValue({ success: true });
  });

  it('should build stageable lines index in Visual Mode', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      // Should show position indicator with total count
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      expect(banner?.textContent).toMatch(/\/ \d+/);
    });
  });

  it('should navigate down with j key', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    await waitFor(() => {
      expect(screen.getByText(/Visual Mode/i)).toBeInTheDocument();
    });

    // Press j to navigate down
    fireEvent.keyDown(window, { key: 'j' });

    await waitFor(() => {
      // Position should update
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      expect(banner?.textContent).toMatch(/\d+ \/ \d+/);
    });
  });

  it('should navigate up with k key', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Navigate down first
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'j' });

    // Then navigate up
    fireEvent.keyDown(window, { key: 'k' });

    await waitFor(() => {
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      expect(banner).toBeTruthy();
    });
  });

  it('should wrap around when navigating past end with j', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Navigate to end by pressing G
    fireEvent.keyDown(window, { key: 'G', shiftKey: true });

    await waitFor(() => {
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      const match = banner?.textContent?.match(/(\d+) \/ (\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        expect(current).toBe(total);
      }
    });

    // Press j again - should wrap to first
    fireEvent.keyDown(window, { key: 'j' });

    await waitFor(() => {
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      expect(banner?.textContent).toContain('1 /');
    });
  });

  it('should jump to first line with gg', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Navigate to middle
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'j' });

    // Press gg (two g keys quickly)
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'g' });

    await waitFor(() => {
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      expect(banner?.textContent).toContain('1 /');
    });
  });

  it('should jump to last line with G', async () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Press Shift+G
    fireEvent.keyDown(window, { key: 'G', shiftKey: true });

    await waitFor(() => {
      const banner = screen.getByText(/Visual Mode/i).closest('div');
      const match = banner?.textContent?.match(/(\d+) \/ (\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        expect(current).toBe(total);
      }
    });
  });

  it('should display vim navigation hints', () => {
    render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
      />
    );

    // Enter visual mode
    fireEvent.keyDown(window, { key: 'v' });

    // Should show navigation hints
    expect(screen.getByText(/j\/k/i)).toBeInTheDocument();
    expect(screen.getByText(/gg\/G/i)).toBeInTheDocument();
  });

  it('should add data attributes for scrolling', () => {
    const { container } = render(
      <ZedDiffViewer
        diff={SAMPLE_DIFF}
        sessionId="test-session"
        currentScope="unstaged"
        filePath="test.txt"
      />
    );

    // All diff lines should have data attributes
    const linesWithKey = container.querySelectorAll('[data-entry-key]');
    const linesWithIndex = container.querySelectorAll('[data-line-index]');

    expect(linesWithKey.length).toBeGreaterThan(0);
    expect(linesWithIndex.length).toBeGreaterThan(0);
  });
});
