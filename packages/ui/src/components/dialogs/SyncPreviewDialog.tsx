import { useState, useEffect, useCallback, useRef } from 'react';
import './SyncPreviewDialog.css';

export interface SyncPreviewDialogProps {
  commitMessage: string | null;
  prTitle: string;
  prBody: string;
  onConfirm: (edited: { commitMessage?: string; prTitle?: string; prBody?: string }) => void;
  onCancel: () => void;
  commitOnly?: boolean; // If true, only show commit message field
}

export function SyncPreviewDialog({
  commitMessage,
  prTitle,
  prBody,
  onConfirm,
  onCancel,
  commitOnly = false,
}: SyncPreviewDialogProps) {
  const [editedCommitMessage, setEditedCommitMessage] = useState(commitMessage || '');
  const [editedPrTitle, setEditedPrTitle] = useState(prTitle);
  const [editedPrBody, setEditedPrBody] = useState(prBody);
  const [focusedField, setFocusedField] = useState<'commit' | 'title' | 'body'>(commitOnly ? 'commit' : 'title');

  const commitInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Update focus when field changes
  useEffect(() => {
    if (focusedField === 'commit' && commitInputRef.current) {
      commitInputRef.current.focus();
    } else if (focusedField === 'title' && titleInputRef.current) {
      titleInputRef.current.focus();
    } else if (focusedField === 'body' && bodyTextareaRef.current) {
      bodyTextareaRef.current.focus();
    }
  }, [focusedField]);

  const handleConfirm = useCallback(() => {
    if (commitOnly) {
      onConfirm({ commitMessage: editedCommitMessage });
    } else {
      onConfirm({
        commitMessage: commitMessage ? editedCommitMessage : undefined,
        prTitle: editedPrTitle,
        prBody: editedPrBody,
      });
    }
  }, [commitOnly, commitMessage, editedCommitMessage, editedPrTitle, editedPrBody, onConfirm]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Allow normal text editing
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleConfirm();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // Tab navigation between fields
      if (e.key === 'Tab') {
        e.preventDefault();
        if (commitOnly) {
          // In commit-only mode, tab does nothing (only one field)
          return;
        }
        if (commitMessage) {
          if (focusedField === 'commit') setFocusedField('title');
          else if (focusedField === 'title') setFocusedField('body');
          else setFocusedField('commit');
        } else {
          if (focusedField === 'title') setFocusedField('body');
          else setFocusedField('title');
        }
      }
    },
    [commitOnly, commitMessage, focusedField, handleConfirm, onCancel]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  return (
    <div className="sync-preview-inline">
      {/* Header */}
      <div className="sync-preview-header">
        <div className="sync-preview-title">{commitOnly ? 'Review commit message' : 'Review sync changes'}</div>
        <div className="sync-preview-subtitle">
          {commitOnly
            ? 'Review and edit the commit message before committing'
            : 'Review and edit the commit message and PR details before syncing'
          }
        </div>
      </div>

      {/* Content */}
      <div className="sync-preview-content">
        {/* Commit message field */}
        {(commitMessage || commitOnly) && (
          <div className="sync-field">
            <label className="sync-field-label">Commit message</label>
            <input
              ref={commitInputRef}
              type="text"
              className="sync-field-input"
              value={editedCommitMessage}
              onChange={(e) => setEditedCommitMessage(e.target.value)}
              onFocus={() => setFocusedField('commit')}
              placeholder="Enter commit message"
            />
          </div>
        )}

        {/* PR title field (only if not commit-only) */}
        {!commitOnly && (
          <div className="sync-field">
            <label className="sync-field-label">PR title</label>
            <input
              ref={titleInputRef}
              type="text"
              className="sync-field-input"
              value={editedPrTitle}
              onChange={(e) => setEditedPrTitle(e.target.value)}
              onFocus={() => setFocusedField('title')}
              placeholder="Enter PR title"
            />
          </div>
        )}

        {/* PR body field (only if not commit-only) */}
        {!commitOnly && (
          <div className="sync-field">
            <label className="sync-field-label">PR description</label>
            <textarea
              ref={bodyTextareaRef}
              className="sync-field-textarea"
              value={editedPrBody}
              onChange={(e) => setEditedPrBody(e.target.value)}
              onFocus={() => setFocusedField('body')}
              placeholder="Enter PR description"
              rows={8}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sync-preview-actions">
        <button
          type="button"
          className="sync-action-button sync-action-confirm"
          onClick={handleConfirm}
        >
          {commitOnly ? 'Confirm and commit' : 'Confirm and sync'}
        </button>
        <button
          type="button"
          className="sync-action-button sync-action-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="keyboard-shortcuts">
        <span className="shortcut">
          <span className="key">⌘/ctrl+enter</span> <span className="hint">confirm</span>
        </span>
        <span className="shortcut">
          <span className="key">tab</span> <span className="hint">next field</span>
        </span>
        <span className="shortcut">
          <span className="key">esc</span> <span className="hint">cancel</span>
        </span>
      </div>
    </div>
  );
}
