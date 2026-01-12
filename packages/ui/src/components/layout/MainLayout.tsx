import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ConversationPanel } from './ConversationPanel';
import { InputBar } from './InputBar';
import { RightPanel } from './RightPanel/index';
import { DiffOverlay } from './DiffOverlay';
import { useLayoutData } from './useLayoutData';
import type { PendingMessage, FileChange } from './types';
import type { DiffTarget } from '../../types/diff';
import { API } from '../../utils/api';
import { SyncPreviewDialog } from '../dialogs/SyncPreviewDialog';

const RIGHT_PANEL_WIDTH_KEY = 'snowtree-right-panel-width';
const DEFAULT_RIGHT_PANEL_WIDTH = 340;
const MIN_RIGHT_PANEL_WIDTH = 260;
const MAX_RIGHT_PANEL_WIDTH = 560;

const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center st-bg">
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center border st-hairline"
        style={{ backgroundColor: 'color-mix(in srgb, var(--st-editor) 55%, transparent)' }}
      >
        <svg className="w-6 h-6" style={{ color: 'var(--st-text-faint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--st-text)' }}>No workspace selected</p>
        <p className="text-xs mt-1 st-text-faint">Select a workspace from the sidebar to get started</p>
      </div>
    </div>
  </div>
);

const LoadingState: React.FC<{ title: string; subtitle?: string; onRetry?: () => void }> = ({ title, subtitle, onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center st-bg">
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--st-text-faint)' }} />
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--st-text)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-1 st-text-faint">{subtitle}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-md text-xs border st-hairline-strong st-hoverable st-focus-ring"
          style={{ backgroundColor: 'color-mix(in srgb, var(--st-editor) 70%, transparent)', color: 'var(--st-text)' }}
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

export const MainLayout: React.FC = React.memo(() => {
  const activeSessionId = useSessionStore(state => state.activeSessionId);
  const sessions = useSessionStore(state => state.sessions);

  const {
    session,
    aiPanel,
    branchName,
    selectedTool,
    isProcessing,
    isLoadingSession,
    loadError,
    reload,
    setSelectedTool,
    sendMessage,
    sendMessageToTool,
    cancelRequest
  } = useLayoutData(activeSessionId);

  const sessionFromStore = useMemo(() => {
    if (!activeSessionId) return null;
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [activeSessionId, sessions]);

  const displaySession = useMemo(() => {
    if (session) return session;
    if (sessionFromStore) return sessionFromStore;
    if (!activeSessionId) return null;
    return {
      id: activeSessionId,
      name: 'Loading…',
      status: 'waiting' as const,
      createdAt: new Date().toISOString(),
    };
  }, [session, sessionFromStore, activeSessionId]);

  const [showDiffOverlay, setShowDiffOverlay] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [selectedDiffTarget, setSelectedDiffTarget] = useState<DiffTarget | null>(null);
  const [diffFiles, setDiffFiles] = useState<FileChange[]>([]);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [inputFocusRequestId, setInputFocusRequestId] = useState(0);
  const [commitReviewArmed, setCommitReviewArmed] = useState(false);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState<{
    commitMessage: string | null;
    prTitle: string;
    prBody: string;
  } | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const stored = localStorage.getItem(RIGHT_PANEL_WIDTH_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      if (!isNaN(width) && width >= MIN_RIGHT_PANEL_WIDTH && width <= MAX_RIGHT_PANEL_WIDTH) {
        return width;
      }
    }
    return DEFAULT_RIGHT_PANEL_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, rightPanelWidth.toString());
  }, [rightPanelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(MIN_RIGHT_PANEL_WIDTH, Math.min(MAX_RIGHT_PANEL_WIDTH, newWidth));
      setRightPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleFileClick = useCallback((filePath: string, target: DiffTarget, files?: FileChange[]) => {
    setSelectedDiffFile(filePath);
    setSelectedDiffTarget(target);
    if (files) {
      setDiffFiles(files);
    }
    setShowDiffOverlay(true);
  }, []);

  const handleCloseDiff = useCallback(() => {
    setShowDiffOverlay(false);
    setSelectedDiffFile(null);
    setSelectedDiffTarget(null);
    setDiffFiles([]);
    setCommitReviewArmed(false);
  }, []);

  // Always close diff overlay when switching workspaces to avoid stale commit ids.
  useEffect(() => {
    handleCloseDiff();
    setPendingMessage(null);
  }, [activeSessionId, handleCloseDiff]);

  const handleSendMessage = useCallback(async (message: string, images?: import('./types').ImageAttachment[], planMode?: boolean) => {
    setPendingMessage({
      content: message,
      timestamp: new Date().toISOString(),
      images
    });
    await sendMessage(message, images, planMode);
  }, [sendMessage]);

  const handleOpenCommitReview = useCallback(async () => {
    if (!session || isProcessing) return;

    // Phase 1: Collect git context for commit
    const context = await API.sessions.getSyncContext(session.id);
    if (!context) {
      console.error('Failed to get sync context');
      return;
    }

    if (!context.diffStat || context.diffStat.trim() === '') {
      console.log('No staged changes to commit');
      return;
    }

    // Phase 2: Build AI prompt to generate commit message
    const toolForSession = selectedTool;
    const commitPromptParts: string[] = [
      'Generate a commit message based on the following staged changes.',
      '',
      '## Git Context',
      '### Status',
      context.status || '(clean)',
      '',
      '### Recent Commits (for style reference)',
      context.log || '(no commits)',
      '',
      '### Staged Changes',
      context.diffStat,
      '',
      '## Task',
      'Return a JSON object with:',
      '```json',
      '{',
      '  "commitMessage": "short, clear commit message in imperative mood"',
      '}',
      '```',
      '',
      '## Guidelines',
      '- Concise, imperative mood (e.g., "Add feature" not "Added feature")',
      '- NO signatures or co-author lines',
      '- Focus on what and why, not how',
      '- One sentence, under 72 characters if possible',
      '',
      'IMPORTANT: Return ONLY the JSON object inside a markdown code fence.',
    ];

    const commitPrompt = commitPromptParts.join('\n');

    // Phase 3: Send to AI (will appear in timeline)
    setPendingMessage({
      content: commitPrompt,
      timestamp: new Date().toISOString(),
    });

    await sendMessageToTool(toolForSession, commitPrompt, { skipCheckpointAutoCommit: true });

    // Phase 4: Wait for AI response and show preview
    setTimeout(async () => {
      const timeline = await API.sessions.getTimeline(session.id);
      if (!timeline.success || !timeline.data) {
        // Fallback
        setSyncPreviewData({
          commitMessage: 'Update',
          prTitle: '', // Not used for commit-only
          prBody: '', // Not used for commit-only
        });
        setCommitReviewArmed(true);
        setShowSyncPreview(true);
        return;
      }

      // Find the last assistant message
      const events = timeline.data as any[];
      const lastAssistantMsg = events
        .filter((e: any) => e.type === 'assistant_message')
        .pop();

      if (lastAssistantMsg?.content) {
        try {
          const jsonMatch = lastAssistantMsg.content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : lastAssistantMsg.content;
          const summary = JSON.parse(jsonStr.trim());

          setSyncPreviewData({
            commitMessage: summary.commitMessage || 'Update',
            prTitle: '', // Not used for commit-only
            prBody: '', // Not used for commit-only
          });
          setCommitReviewArmed(true);
          setShowSyncPreview(true);
        } catch (error) {
          console.error('Failed to parse AI response:', error);
          setSyncPreviewData({
            commitMessage: 'Update',
            prTitle: '',
            prBody: '',
          });
          setCommitReviewArmed(true);
          setShowSyncPreview(true);
        }
      } else {
        setSyncPreviewData({
          commitMessage: 'Update',
          prTitle: '',
          prBody: '',
        });
        setCommitReviewArmed(true);
        setShowSyncPreview(true);
      }
    }, 2000);
  }, [session, isProcessing, selectedTool, sendMessageToTool]);

  const handleRequestPushPR = useCallback(async () => {
    if (!session || isProcessing) return;
    if (session.toolType !== 'codex' && session.toolType !== 'claude') return;

    handleCloseDiff();
    setInputFocusRequestId((prev) => prev + 1);

    // Phase 1: Collect git context and PR template
    const [context, templateData] = await Promise.all([
      API.sessions.getSyncContext(session.id),
      API.sessions.getPrTemplate(session.id),
    ]);

    if (!context) {
      console.error('Failed to get sync context');
      return;
    }

    const hasUncommittedChanges = context.diffStat && context.diffStat.trim() !== '';

    // Phase 2: Build AI prompt with context and template
    const toolForSession = selectedTool;
    const promptParts: string[] = [
      'Generate commit message (if needed) and PR details based on the following information.',
      '',
      '## Git Context',
      '### Status',
      context.status || '(clean)',
      '',
      '### Recent Commits',
      context.log || '(no commits)',
      '',
      '### Staged Changes',
      context.diffStat || '(no staged changes)',
      '',
      '### Existing PR',
      context.prInfo ? `PR #${context.prInfo.number}: ${context.prInfo.title}\n${context.prInfo.body}` : '(no existing PR)',
    ];

    if (templateData?.template) {
      promptParts.push(
        '',
        '## PR Template',
        'Follow this template structure for the PR body:',
        '```',
        templateData.template,
        '```',
      );
    }

    promptParts.push(
      '',
      '## Task',
      'Return a JSON object with the following structure:',
      '```json',
      '{',
      '  "commitMessage": "short commit message if there are uncommitted staged changes, or null",',
      '  "prTitle": "clear, descriptive PR title",',
      '  "prBody": "PR description following the template above (if provided)"',
      '}',
      '```',
      '',
      '## Guidelines',
      '- Commit message: concise, imperative mood (e.g., "Add feature" not "Added feature"), NO signatures',
      '- PR title: clear, specific, describes the change',
      '- PR body: follow the template structure if provided, include ## Summary and ## Test plan sections',
      '- Do NOT include co-author or generated-by signatures',
      '- If there are no uncommitted staged changes, set commitMessage to null',
      '',
      'IMPORTANT: Return ONLY the JSON object inside a markdown code fence. Nothing else.',
    );

    const summarizePrompt = promptParts.join('\n');

    // Phase 3: Send to AI (will appear in timeline)
    setPendingMessage({
      content: summarizePrompt,
      timestamp: new Date().toISOString(),
    });

    await sendMessageToTool(toolForSession, summarizePrompt, { skipCheckpointAutoCommit: true });

    // Phase 4: Show loading state while waiting for AI response
    // TODO: Monitor timeline events to extract AI response
    // For now, show a simple template-based preview after a delay
    setTimeout(async () => {
      // Refetch timeline to get AI response
      const timeline = await API.sessions.getTimeline(session.id);
      if (!timeline.success || !timeline.data) {
        // Fallback to template defaults
        setSyncPreviewData({
          commitMessage: hasUncommittedChanges ? 'Update from worktree' : null,
          prTitle: `Update from ${context.branch}`,
          prBody: templateData?.template || '## Summary\n\n- Update from worktree\n\n## Test plan\n\n- [ ] Review changes',
        });
        setShowSyncPreview(true);
        return;
      }

      // Find the last assistant message
      const events = timeline.data as any[];
      const lastAssistantMsg = events
        .filter((e: any) => e.type === 'assistant_message')
        .pop();

      if (lastAssistantMsg?.content) {
        try {
          // Extract JSON from markdown code fence
          const jsonMatch = lastAssistantMsg.content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : lastAssistantMsg.content;
          const summary = JSON.parse(jsonStr.trim());

          setSyncPreviewData({
            commitMessage: summary.commitMessage || null,
            prTitle: summary.prTitle || `Update from ${context.branch}`,
            prBody: summary.prBody || (templateData?.template || '## Summary\n\n- Update\n\n## Test plan\n\n- [ ] Review'),
          });
          setShowSyncPreview(true);
        } catch (error) {
          console.error('Failed to parse AI response:', error);
          // Fallback
          setSyncPreviewData({
            commitMessage: hasUncommittedChanges ? 'Update from worktree' : null,
            prTitle: `Update from ${context.branch}`,
            prBody: templateData?.template || '## Summary\n\n- Update\n\n## Test plan\n\n- [ ] Review',
          });
          setShowSyncPreview(true);
        }
      } else {
        // No response yet, use template
        setSyncPreviewData({
          commitMessage: hasUncommittedChanges ? 'Update from worktree' : null,
          prTitle: `Update from ${context.branch}`,
          prBody: templateData?.template || '## Summary\n\n- Update\n\n## Test plan\n\n- [ ] Review',
        });
        setShowSyncPreview(true);
      }
    }, 2000); // Wait 2 seconds for AI response
  }, [session, isProcessing, selectedTool, handleCloseDiff, sendMessageToTool]);

  const handleCommitClick = useCallback((target: DiffTarget, files: FileChange[]) => {
    setSelectedDiffTarget(target);
    setDiffFiles(files);
    setSelectedDiffFile(null);
    setShowDiffOverlay(true);
  }, []);

  const handleSyncPreviewConfirm = useCallback(async (edited: { commitMessage?: string; prTitle?: string; prBody?: string }) => {
    if (!session || isProcessing) return;

    setShowSyncPreview(false);
    setSyncPreviewData(null);

    try {
      if (commitReviewArmed) {
        // Commit-only mode: just execute commit
        if (edited.commitMessage) {
          const commitResult = await API.sessions.executeCommit(session.id, edited.commitMessage);
          if (!commitResult.success) {
            console.error('Commit failed:', commitResult.error);
            return;
          }
          console.log('Commit completed successfully');
        }
        setCommitReviewArmed(false);
      } else {
        // Full sync mode: commit + push + PR
        // Phase 4: Execute deterministic operations
        // 1. If there's a commit message and staged changes, commit them
        if (edited.commitMessage) {
          const commitResult = await API.sessions.executeCommit(session.id, edited.commitMessage);
          if (!commitResult.success) {
            console.error('Commit failed:', commitResult.error);
            return;
          }
        }

        // 2. Push to remote
        const pushResult = await API.sessions.executePush(session.id);
        if (!pushResult.success) {
          console.error('Push failed:', pushResult.error);
          return;
        }

        // 3. Create or update PR
        const context = await API.sessions.getSyncContext(session.id);
        const baseBranch = context?.baseBranch || 'main';
        const ownerRepo = context?.ownerRepo;

        const prResult = await API.sessions.executePr(session.id, {
          title: edited.prTitle || 'Update',
          body: edited.prBody || '',
          baseBranch,
          ownerRepo: ownerRepo || undefined,
        });

        if (!prResult.success) {
          console.error('PR operation failed:', prResult.error);
          return;
        }

        console.log('Sync completed successfully');
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  }, [session, isProcessing, commitReviewArmed]);

  const handleSyncPreviewCancel = useCallback(() => {
    setShowSyncPreview(false);
    setSyncPreviewData(null);
    setCommitReviewArmed(false);
  }, []);

  // Clear pending message when processing completes
  useEffect(() => {
    if (!isProcessing && pendingMessage) {
      // Small delay to let the real message appear first
      const timer = setTimeout(() => setPendingMessage(null), 500);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, pendingMessage]);

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex h-full st-bg">
        <EmptyState />
      </div>
    );
  }

  if (!displaySession) {
    return (
      <div className="flex-1 flex h-full st-bg">
        <LoadingState title="Loading workspace…" subtitle="Preparing view…" />
      </div>
    );
  }

  const isCliAgent = displaySession.toolType === 'claude' || displaySession.toolType === 'codex';

  return (
    <div className="flex-1 flex h-full overflow-hidden st-bg" data-testid="main-layout">
      <div className="flex-1 flex flex-col min-w-0 relative">
        <WorkspaceHeader
          session={displaySession}
          branchName={branchName}
        />

        {session ? (
          <>
            <div key={session.id} className="flex-1 flex flex-col min-h-0 overflow-hidden animate-st-panel-in">
              <ConversationPanel
                session={session}
                pendingMessage={pendingMessage}
              />
            </div>

            {showSyncPreview && syncPreviewData && (
              <div className="px-4 pb-3">
                <SyncPreviewDialog
                  commitMessage={syncPreviewData.commitMessage}
                  prTitle={syncPreviewData.prTitle}
                  prBody={syncPreviewData.prBody}
                  onConfirm={handleSyncPreviewConfirm}
                  onCancel={handleSyncPreviewCancel}
                />
              </div>
            )}

            <InputBar
              session={session}
              panelId={aiPanel?.id || null}
              selectedTool={selectedTool}
              onToolChange={setSelectedTool}
              onSend={handleSendMessage}
              onCancel={cancelRequest}
              isProcessing={isProcessing}
              focusRequestId={inputFocusRequestId}
            />
          </>
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {isLoadingSession ? (
              <LoadingState title="Loading workspace…" subtitle="Fetching timeline, panels, and git status" />
            ) : (
              <LoadingState title="Failed to load workspace" subtitle={loadError || 'Unknown error'} onRetry={reload} />
            )}
          </div>
        )}

        <DiffOverlay
          isOpen={showDiffOverlay}
          filePath={selectedDiffFile}
          sessionId={displaySession.id}
          target={selectedDiffTarget}
          files={diffFiles}
          onClose={handleCloseDiff}
        />
      </div>

      <div
        className="group w-2 flex-shrink-0 cursor-col-resize relative"
        onMouseDown={handleResizeStart}
        data-testid="resize-handle"
      >
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors"
          style={{
            backgroundColor: isResizing
              ? 'color-mix(in srgb, var(--st-accent) 75%, transparent)'
              : 'color-mix(in srgb, var(--st-border) 65%, transparent)',
          }}
        />
        <div
          className="absolute inset-y-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in srgb, var(--st-accent) 18%, transparent), transparent)',
          }}
        />
      </div>

      <div
        className="flex-shrink-0 h-full"
        style={{ width: rightPanelWidth }}
        data-testid="right-panel"
      >
        <RightPanel
          key={displaySession.id}
          session={displaySession}
          onFileClick={handleFileClick}
          onCommitUncommittedChanges={isCliAgent ? handleOpenCommitReview : undefined}
          isCommitDisabled={isProcessing}
          onCommitClick={handleCommitClick}
          onPushPR={isCliAgent ? handleRequestPushPR : undefined}
          isPushPRDisabled={isProcessing}
        />
      </div>
    </div>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;
