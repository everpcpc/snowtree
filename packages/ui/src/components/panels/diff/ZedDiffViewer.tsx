import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { API } from '../../../utils/api';

interface DiffLine {
  type: 'added' | 'deleted' | 'modified' | 'context' | 'hunk';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

type NonHunkDiffLine = Exclude<DiffLine, { type: 'hunk' }>;

interface DiffStats {
  additions: number;
  deletions: number;
  fileType: 'added' | 'deleted' | 'modified' | 'renamed';
}

interface FileMeta {
  path: string;
  additions: number;
  deletions: number;
  type: 'added' | 'deleted' | 'modified' | 'renamed';
}

interface ZedDiffViewerProps {
  diff: string;
  filePath?: string;
  filesMeta?: FileMeta[];
  className?: string;

  // Line staging props
  sessionId?: string;
  currentScope?: 'staged' | 'unstaged';
  onLineStaged?: () => void;
}

// CSS variable references
const css = {
  bg: 'var(--st-diff-bg)',
  headerBg: 'var(--st-diff-header-bg)',
  headerHover: 'var(--st-diff-header-hover)',
  border: 'var(--st-diff-border)',
  borderFaint: 'var(--st-diff-border-faint)',
  text: 'var(--st-diff-text)',
  textStrong: 'var(--st-diff-text-strong)',
  textMuted: 'var(--st-diff-text-muted)',
  gutterFg: 'var(--st-diff-gutter-fg)',
  gutterHoverFg: 'var(--st-diff-gutter-hover-fg)',
  addedMarker: 'var(--st-diff-added-marker)',
  deletedMarker: 'var(--st-diff-deleted-marker)',
  modifiedMarker: 'var(--st-diff-modified-marker)',
  renamedMarker: 'var(--st-diff-renamed-marker)',
  addedBg: 'var(--st-diff-added-bg)',
  deletedBg: 'var(--st-diff-deleted-bg)',
  modifiedBg: 'var(--st-diff-modified-bg)',
  addedBgHover: 'var(--st-diff-added-bg-hover)',
  deletedBgHover: 'var(--st-diff-deleted-bg-hover)',
  modifiedBgHover: 'var(--st-diff-modified-bg-hover)',
  hunkBg: 'var(--st-diff-hunk-bg)',
  hunkText: 'var(--st-diff-hunk-text)',
  fontMono: 'var(--st-font-mono)',
};

// Status icon component (Zed style)
const StatusIcon: React.FC<{ type: DiffStats['fileType']; size?: number }> = ({ type, size = 14 }) => {
  const config: Record<string, { icon: string; color: string }> = {
    added: { icon: '+', color: css.addedMarker },
    modified: { icon: '●', color: css.modifiedMarker },
    deleted: { icon: '−', color: css.deletedMarker },
    renamed: { icon: '→', color: css.renamedMarker },
  };
  const { icon, color } = config[type] || config.modified;

  return (
    <span
      style={{
        color,
        fontSize: size,
        fontWeight: 600,
        width: 16,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
};

// Shortcut hint components for bottom status bar
const ShortcutKey: React.FC<{
  keyName: string;
  action: string;
  primary?: boolean;
}> = ({ keyName, action, primary }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <kbd
      style={{
        backgroundColor: primary ? 'rgba(100, 150, 255, 0.15)' : css.border,
        color: primary ? 'rgba(100, 150, 255, 1)' : css.text,
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: 10,
        fontWeight: 600,
        border: `1px solid ${primary ? 'rgba(100, 150, 255, 0.3)' : css.borderFaint}`,
        fontFamily: 'monospace',
      }}
    >
      {keyName}
    </kbd>
    <span style={{ fontSize: 11, color: primary ? css.textStrong : css.textMuted }}>
      {action}
    </span>
  </span>
);

const Separator: React.FC = () => (
  <span style={{ color: css.borderFaint }}>•</span>
);

// Extract filename and directory from path
const splitPath = (path: string): { name: string; dir: string } => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return { name: path, dir: '' };
  return {
    name: parts[parts.length - 1],
    dir: parts.slice(0, -1).join('/') + '/',
  };
};

const calculateDiffStats = (diff: string): DiffStats => {
  let additions = 0;
  let deletions = 0;
  let fileType: DiffStats['fileType'] = 'modified';

  if (diff.includes('new file mode')) fileType = 'added';
  else if (diff.includes('deleted file mode')) fileType = 'deleted';
  else if (diff.includes('rename from')) fileType = 'renamed';

  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }

  return { additions, deletions, fileType };
};

const splitDiffIntoFiles = (fullDiff: string): Array<{ path: string; diff: string }> => {
  const chunks = fullDiff.match(/diff --git[\s\S]*?(?=diff --git|$)/g);
  if (!chunks || chunks.length === 0) return [{ path: '', diff: fullDiff }];

  return chunks.map((chunk) => {
    const fileNameMatch = chunk.match(/diff --git a\/(.*?) b\/(.*?)(?:\n|$)/);
    const path = (fileNameMatch?.[2] || fileNameMatch?.[1] || '').trim();
    return { path, diff: chunk };
  });
};

const parseDiffToLines = (diff: string): DiffLine[] => {
  const lines: DiffLine[] = [];
  const diffLines = diff.split('\n');

  let oldLineNum = 0;
  let newLineNum = 0;
  let inHunk = false;

  for (const line of diffLines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      oldLineNum = parseInt(hunkMatch[1], 10);
      newLineNum = parseInt(hunkMatch[3], 10);
      inHunk = true;
      lines.push({ type: 'hunk', content: hunkMatch[5] || '' });
      continue;
    }

    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('old mode') ||
      line.startsWith('new mode') ||
      line.startsWith('similarity index') ||
      line.startsWith('rename from') ||
      line.startsWith('rename to') ||
      line.startsWith('Binary files')
    ) {
      continue;
    }

    if (!inHunk) continue;

    if (line.startsWith('+')) {
      lines.push({ type: 'added', content: line.substring(1), newLineNumber: newLineNum++ });
    } else if (line.startsWith('-')) {
      lines.push({ type: 'deleted', content: line.substring(1), oldLineNumber: oldLineNum++ });
    } else if (line.startsWith(' ') || line === '') {
      lines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.substring(1) : line,
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
    } else if (line.startsWith('\\')) {
      continue;
    }
  }

  // Heuristic: consecutive delete+add = modified
  const out: DiffLine[] = [];
  let i = 0;
  while (i < lines.length) {
    const current = lines[i];
    if (current.type !== 'deleted') {
      out.push(current);
      i++;
      continue;
    }

    let delEnd = i;
    while (delEnd < lines.length && lines[delEnd].type === 'deleted') delEnd++;

    let addEnd = delEnd;
    while (addEnd < lines.length && lines[addEnd].type === 'added') addEnd++;

    if (addEnd > delEnd) {
      for (let j = i; j < addEnd; j++) out.push({ ...lines[j], type: 'modified' });
      i = addEnd;
      continue;
    }

    out.push(current);
    i++;
  }

  return out;
};

// Hunk header row
const HunkRow: React.FC<{ content: string }> = ({ content }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      height: 28,
      backgroundColor: css.hunkBg,
      borderTop: `1px solid ${css.borderFaint}`,
      borderBottom: `1px solid ${css.borderFaint}`,
      fontFamily: css.fontMono,
      fontSize: 12,
    }}
  >
    <div style={{ width: 3, flexShrink: 0 }} />
    <div
      style={{
        width: 90,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: css.hunkText,
        fontSize: 11,
      }}
    >
      ···
    </div>
    <div
      style={{
        flex: 1,
        paddingLeft: 12,
        color: css.hunkText,
        fontSize: 11,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {content.trim()}
    </div>
  </div>
);

// Single diff line row
const DiffLineRow: React.FC<{
  line: NonHunkDiffLine;
  sessionId?: string;
  filePath?: string;
  currentScope?: 'staged' | 'unstaged';
  onLineStaged?: () => void;
  visualMode?: boolean;
  isSelected?: boolean;
  isAnchor?: boolean;
  isCursor?: boolean;
  entryKey?: string;
  lineIndex?: number;
  onVisualClick?: (entryKey: string, lineIndex: number) => void;
}> = React.memo(({ line, sessionId, filePath, currentScope, onLineStaged, visualMode, isSelected, isAnchor, isCursor, entryKey, lineIndex, onVisualClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isStaging, setIsStaging] = useState(false);

  const handleStage = useCallback(async () => {
    // Only allow clicking on added/deleted/modified lines
    if (line.type !== 'added' && line.type !== 'deleted' && line.type !== 'modified') {
      return;
    }

    // Determine actual type for modified lines
    let actualType: 'added' | 'deleted';
    if (line.type === 'modified') {
      // Modified line with only old line number = deleted
      // Modified line with only new line number = added
      if (line.oldLineNumber && !line.newLineNumber) {
        actualType = 'deleted';
      } else if (line.newLineNumber && !line.oldLineNumber) {
        actualType = 'added';
      } else {
        // Both line numbers present - can't stage this
        return;
      }
    } else {
      actualType = line.type as 'added' | 'deleted';
    }
    if (!sessionId || !filePath || !currentScope) {
      return;
    }

    setIsStaging(true);

    try {
      const isStaging = currentScope === 'unstaged';

      await API.sessions.stageLine(sessionId, {
        filePath,
        isStaging,
        targetLine: {
          type: actualType,
          oldLineNumber: line.oldLineNumber ?? null,
          newLineNumber: line.newLineNumber ?? null,
        },
      });

      // Refresh diff
      onLineStaged?.();
    } catch (error) {
      console.error('Failed to stage line:', error);
      alert(`Failed to ${currentScope === 'unstaged' ? 'stage' : 'unstage'} line: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStaging(false);
    }
  }, [line.type, line.oldLineNumber, line.newLineNumber, sessionId, filePath, currentScope, onLineStaged]);

  const isChange = line.type === 'added' || line.type === 'deleted' || line.type === 'modified';
  const isDeleted = line.type === 'deleted' || (line.type === 'modified' && line.oldLineNumber && !line.newLineNumber);
  const isAdded = line.type === 'added' || (line.type === 'modified' && line.newLineNumber && !line.oldLineNumber);

  // Determine if line can be staged
  const canStage = (line.type === 'added' || line.type === 'deleted' || line.type === 'modified') && sessionId && filePath && currentScope;

  // Keyboard shortcut: '1' key to stage/unstage when hovering
  useEffect(() => {
    if (!isHovered || !canStage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && !isStaging) {
        e.preventDefault();
        handleStage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, canStage, isStaging, handleStage]);

  // Click handler: visual mode selection or direct staging
  const handleClick = useCallback(() => {
    if (visualMode && canStage && entryKey !== undefined && lineIndex !== undefined) {
      // Visual mode: set selection
      onVisualClick?.(entryKey, lineIndex);
    } else if (!visualMode) {
      // Normal mode: direct stage
      handleStage();
    }
  }, [visualMode, canStage, entryKey, lineIndex, onVisualClick, handleStage]);

  // Background color and left border
  let bg = 'transparent';
  let leftBorder = 'none';
  let markerWidth = 3;

  if (isSelected) {
    // Selected in visual mode - use stronger highlight and left border
    bg = 'rgba(100, 150, 255, 0.35)'; // Increased from 0.25 to 0.35
    leftBorder = '2px solid rgba(100, 150, 255, 0.6)';
    markerWidth = 1; // Adjust marker to accommodate border
  } else if (isChange) {
    if (line.type === 'added' || (line.type === 'modified' && isAdded)) {
      bg = isHovered ? css.addedBgHover : css.addedBg;
    } else if (line.type === 'deleted' || (line.type === 'modified' && isDeleted)) {
      bg = isHovered ? css.deletedBgHover : css.deletedBg;
    } else if (line.type === 'modified') {
      bg = isHovered ? css.modifiedBgHover : css.modifiedBg;
    }
  } else if (isHovered) {
    bg = css.headerHover;
  }

  // Marker color (for non-selected lines)
  let marker = 'transparent';
  if (!isSelected) {
    if (line.type === 'added') marker = css.addedMarker;
    else if (line.type === 'deleted') marker = css.deletedMarker;
    else if (line.type === 'modified') {
      marker = isDeleted ? css.deletedMarker : isAdded ? css.addedMarker : css.modifiedMarker;
    }
  }

  const textColor = isChange ? css.textStrong : css.text;
  const lineNumColor = isHovered ? css.gutterHoverFg : css.gutterFg;

  const cursor = canStage && !isStaging ? 'pointer' : 'default';
  const opacity = isStaging ? 0.5 : 1;

  return (
    <div
      data-entry-key={entryKey}
      data-line-index={lineIndex}
      data-type={line.type}
      data-selected={isSelected || undefined}
      style={{
        display: 'flex',
        fontFamily: css.fontMono,
        fontSize: 12,
        lineHeight: '20px',
        backgroundColor: bg,
        cursor,
        opacity,
        position: 'relative',
        borderLeft: leftBorder,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={
        visualMode
          ? 'Click to select/extend selection'
          : canStage
            ? (currentScope === 'unstaged' ? 'Click to stage' : 'Click to unstage')
            : ''
      }
    >
      {/* Left marker */}
      <div style={{ width: markerWidth, flexShrink: 0, backgroundColor: marker }} />

      {/* Anchor indicator (left side, light blue) */}
      {isAnchor && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 3,
            height: '100%',
            backgroundColor: 'rgba(100, 200, 255, 0.8)',
          }}
        />
      )}

      {/* Cursor indicator (right side, light green) */}
      {isCursor && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 3,
            height: '100%',
            backgroundColor: 'rgba(100, 255, 150, 0.8)',
          }}
        />
      )}

      {/* Old line number */}
      <div
        style={{
          width: 45,
          flexShrink: 0,
          textAlign: 'right',
          paddingRight: 8,
          color: lineNumColor,
          userSelect: 'none',
          backgroundColor: css.bg,
        }}
      >
        {line.oldLineNumber ?? ''}
      </div>

      {/* New line number */}
      <div
        style={{
          width: 45,
          flexShrink: 0,
          textAlign: 'right',
          paddingRight: 8,
          color: lineNumColor,
          userSelect: 'none',
          borderRight: `1px solid ${css.borderFaint}`,
          backgroundColor: css.bg,
        }}
      >
        {line.newLineNumber ?? ''}
      </div>

      {/* Code content */}
      <div
        style={{
          flex: 1,
          paddingLeft: 12,
          paddingRight: 16,
          whiteSpace: 'pre',
          color: textColor,
          overflow: 'hidden',
        }}
      >
        {line.content || '\u00A0'}
      </div>

      {/* Staging indicator */}
      {isStaging && (
        <div
          style={{
            position: 'absolute',
            right: 8,
            fontSize: 11,
            color: css.textMuted,
          }}
        >
          Staging...
        </div>
      )}
    </div>
  );
});

DiffLineRow.displayName = 'DiffLineRow';

// File header component
const FileHeader: React.FC<{
  name: string;
  dir: string;
  stats: DiffStats;
  collapsed: boolean;
  onToggle: () => void;
}> = ({ name, dir, stats, collapsed, onToggle }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDeleted = stats.fileType === 'deleted';

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        backgroundColor: isHovered ? css.headerHover : css.headerBg,
        borderBottom: `1px solid ${css.borderFaint}`,
        cursor: 'pointer',
        border: 'none',
        textAlign: 'left',
        fontFamily: css.fontMono,
        fontSize: 12,
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Collapse chevron */}
      <span style={{ color: css.textMuted, display: 'flex', alignItems: 'center' }}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </span>

      {/* Status icon */}
      <StatusIcon type={stats.fileType} />

      {/* File name (prominent) */}
      <span
        style={{
          color: isDeleted ? css.textMuted : css.textStrong,
          textDecoration: isDeleted ? 'line-through' : 'none',
          fontWeight: 500,
        }}
      >
        {name}
      </span>

      {/* Directory path (muted) */}
      {dir && (
        <span
          style={{
            color: css.textMuted,
            textDecoration: isDeleted ? 'line-through' : 'none',
          }}
        >
          {dir}
        </span>
      )}

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Stats */}
      <span style={{ display: 'flex', gap: 8, fontSize: 11 }}>
        {stats.additions > 0 && (
          <span style={{ color: css.addedMarker }}>+{stats.additions}</span>
        )}
        {stats.deletions > 0 && (
          <span style={{ color: css.deletedMarker }}>−{stats.deletions}</span>
        )}
      </span>
    </button>
  );
};

export const ZedDiffViewer: React.FC<ZedDiffViewerProps> = ({
  diff,
  filePath,
  filesMeta,
  className = '',
  sessionId,
  currentScope,
  onLineStaged,
}) => {
  const metaByPath = useMemo(() => {
    const map = new Map<string, FileMeta>();
    for (const m of filesMeta ?? []) map.set(m.path, m);
    return map;
  }, [filesMeta]);

  const orderIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const [idx, m] of (filesMeta ?? []).entries()) map.set(m.path, idx);
    return map;
  }, [filesMeta]);

  const entries = useMemo(() => {
    const raw = filePath
      ? [{ path: filePath, diff }]
      : splitDiffIntoFiles(diff).filter((s) => s.diff.trim() !== '');

    return raw
      .map((e) => {
        const displayPath = e.path || '(unknown)';
        const { name, dir } = splitPath(displayPath);
        const meta = metaByPath.get(e.path) ?? metaByPath.get(displayPath);
        const stats = meta
          ? { additions: meta.additions, deletions: meta.deletions, fileType: meta.type }
          : calculateDiffStats(e.diff);
        const lines = parseDiffToLines(e.diff);
        const isBinary = e.diff.includes('Binary files');

        return {
          path: e.path,
          displayPath,
          name,
          dir,
          stats,
          lines,
          isBinary,
          order: orderIndex.get(e.path) ?? orderIndex.get(displayPath) ?? Number.MAX_SAFE_INTEGER,
          key: e.path || e.diff.slice(0, 32),
        };
      })
      .sort((a, b) => a.order - b.order || a.displayPath.localeCompare(b.displayPath));
  }, [diff, filePath, metaByPath, orderIndex]);

  const [collapsedByPath, setCollapsedByPath] = useState<Record<string, boolean>>({});
  const toggleCollapsed = useCallback((path: string) => {
    setCollapsedByPath((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  // Visual Mode state
  const [visualMode, setVisualMode] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<{ entryKey: string; lineIndex: number } | null>(null);
  const [currentCursor, setCurrentCursor] = useState<{ entryKey: string; lineIndex: number } | null>(null);

  // Vim navigation state
  type StageableLineRef = {
    entryKey: string;
    lineIndex: number;
    globalIndex: number;
  };
  const [stageableLines, setStageableLines] = useState<StageableLineRef[]>([]);
  const [currentGlobalIndex, setCurrentGlobalIndex] = useState<number | null>(null);
  const ggKeyPressedRef = useRef(false);
  const ggResetTimerRef = useRef<number | null>(null);

  // Container ref for auto-focus
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Get all stageable lines in selection range
  const getSelectedLines = useCallback(() => {
    if (!selectionAnchor || !currentCursor) return [];

    // Find entry and line indices
    const anchorEntry = entries.find(e => e.key === selectionAnchor.entryKey);
    const cursorEntry = entries.find(e => e.key === currentCursor.entryKey);

    if (!anchorEntry || !cursorEntry) return [];
    if (anchorEntry.key !== cursorEntry.key) return []; // Only support same-file selection for now

    const start = Math.min(selectionAnchor.lineIndex, currentCursor.lineIndex);
    const end = Math.max(selectionAnchor.lineIndex, currentCursor.lineIndex);

    const selectedLines: Array<{ line: DiffLine; entryKey: string; filePath: string }> = [];

    for (let i = start; i <= end; i++) {
      const line = anchorEntry.lines[i];
      if (line && (line.type === 'added' || line.type === 'deleted' || line.type === 'modified')) {
        selectedLines.push({
          line,
          entryKey: anchorEntry.key,
          filePath: anchorEntry.path,
        });
      }
    }

    return selectedLines;
  }, [selectionAnchor, currentCursor, entries]);

  // Handle visual mode line click
  const handleVisualClick = useCallback((entryKey: string, lineIndex: number) => {
    if (!selectionAnchor) {
      // First click - set anchor
      setSelectionAnchor({ entryKey, lineIndex });
      setCurrentCursor({ entryKey, lineIndex });
    } else {
      // Second click - set cursor (extend selection)
      setCurrentCursor({ entryKey, lineIndex });
    }
  }, [selectionAnchor]);

  // Build stageable lines index for vim navigation
  useEffect(() => {
    const index: StageableLineRef[] = [];
    let globalIdx = 0;

    for (const entry of entries) {
      if (collapsedByPath[entry.path]) continue; // Skip collapsed files

      for (let lineIdx = 0; lineIdx < entry.lines.length; lineIdx++) {
        const line = entry.lines[lineIdx];
        if (line.type === 'added' || line.type === 'deleted' || line.type === 'modified') {
          index.push({ entryKey: entry.key, lineIndex: lineIdx, globalIndex: globalIdx++ });
        }
      }
    }

    setStageableLines(index);

    // Reset cursor if out of bounds
    if (currentGlobalIndex !== null && currentGlobalIndex >= index.length) {
      setCurrentGlobalIndex(null);
      setCurrentCursor(null);
    }
  }, [entries, collapsedByPath, currentGlobalIndex]);

  // Initialize navigation position when entering Visual Mode (so the banner can display `1 / N`).
  useEffect(() => {
    if (!visualMode) return;
    if (currentGlobalIndex !== null) return;
    if (stageableLines.length === 0) return;
    setCurrentGlobalIndex(0);
  }, [visualMode, currentGlobalIndex, stageableLines]);

  // Scroll line into view
  const scrollLineIntoView = useCallback((entryKey: string, lineIndex: number) => {
    const selector = `[data-entry-key="${entryKey}"][data-line-index="${lineIndex}"]`;
    const element = containerRef.current?.querySelector(selector);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, []);

  // Move cursor to specific global index
  const moveCursorTo = useCallback((globalIndex: number) => {
    const lineRef = stageableLines[globalIndex];
    if (!lineRef) return;

    setCurrentGlobalIndex(globalIndex);

    if (!selectionAnchor) {
      // First navigation - set both anchor and cursor
      setSelectionAnchor({ entryKey: lineRef.entryKey, lineIndex: lineRef.lineIndex });
      setCurrentCursor({ entryKey: lineRef.entryKey, lineIndex: lineRef.lineIndex });
    } else {
      // Already has anchor - only move cursor (extend selection)
      setCurrentCursor({ entryKey: lineRef.entryKey, lineIndex: lineRef.lineIndex });
    }

    scrollLineIntoView(lineRef.entryKey, lineRef.lineIndex);
  }, [stageableLines, selectionAnchor, scrollLineIntoView]);

  // j - navigate down
  const handleNavigateDown = useCallback(() => {
    if (stageableLines.length === 0) return;

    let nextIndex: number;
    if (currentGlobalIndex === null) {
      nextIndex = 0; // Start from first
    } else if (currentGlobalIndex >= stageableLines.length - 1) {
      nextIndex = 0; // Wrap to first
    } else {
      nextIndex = currentGlobalIndex + 1;
    }

    moveCursorTo(nextIndex);
  }, [stageableLines, currentGlobalIndex, moveCursorTo]);

  // k - navigate up
  const handleNavigateUp = useCallback(() => {
    if (stageableLines.length === 0) return;

    let nextIndex: number;
    if (currentGlobalIndex === null) {
      nextIndex = stageableLines.length - 1; // Start from last
    } else if (currentGlobalIndex <= 0) {
      nextIndex = stageableLines.length - 1; // Wrap to last
    } else {
      nextIndex = currentGlobalIndex - 1;
    }

    moveCursorTo(nextIndex);
  }, [stageableLines, currentGlobalIndex, moveCursorTo]);

  // gg - navigate to first
  const handleNavigateToFirst = useCallback(() => {
    if (stageableLines.length === 0) return;
    moveCursorTo(0);
  }, [stageableLines, moveCursorTo]);

  // G - navigate to last
  const handleNavigateToLast = useCallback(() => {
    if (stageableLines.length === 0) return;
    moveCursorTo(stageableLines.length - 1);
  }, [stageableLines, moveCursorTo]);

  // Keyboard shortcuts for Visual Mode
  useEffect(() => {
    const clearGgState = () => {
      ggKeyPressedRef.current = false;
      if (ggResetTimerRef.current) {
        window.clearTimeout(ggResetTimerRef.current);
        ggResetTimerRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Vim navigation (only in Visual Mode)
      if (visualMode && stageableLines.length > 0) {
        // j - navigate down
        if (e.key === 'j' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleNavigateDown();
          return;
        }

        // k - navigate up
        if (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleNavigateUp();
          return;
        }

        // G - navigate to last
        if (e.key === 'G' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleNavigateToLast();
          clearGgState();
          return;
        }

        // g - gg double-tap detection
        if (e.key === 'g' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (ggKeyPressedRef.current) {
            // Second g press
            handleNavigateToFirst();
            clearGgState();
          } else {
            // First g press
            ggKeyPressedRef.current = true;
            if (ggResetTimerRef.current) window.clearTimeout(ggResetTimerRef.current);
            ggResetTimerRef.current = window.setTimeout(() => {
              ggKeyPressedRef.current = false;
              ggResetTimerRef.current = null;
            }, 800);
          }
          return;
        }

        // Any other key resets gg state
        if (ggKeyPressedRef.current && e.key !== 'g') {
          clearGgState();
        }
      }

      // 'v' - Toggle Visual Mode
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setVisualMode(prev => !prev);
        if (visualMode) {
          // Exiting visual mode - clear selection
          setSelectionAnchor(null);
          setCurrentCursor(null);
        }
        clearGgState();
        return;
      }

      // Esc - Exit Visual Mode
      if (e.key === 'Escape' && visualMode) {
        e.preventDefault();
        setVisualMode(false);
        setSelectionAnchor(null);
        setCurrentCursor(null);
        clearGgState();
        return;
      }

      // 'a' - Stage all changes in current file
      if (e.key === 'a' && !visualMode && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();

        if (!sessionId || !currentScope || entries.length === 0) return;

        // Stage all lines in the first entry (or only entry if filePath is specified)
        const targetEntry = entries[0];
        if (!targetEntry) return;

        const isStaging = currentScope === 'unstaged';

        (async () => {
          for (const line of targetEntry.lines) {
            if (line.type !== 'added' && line.type !== 'deleted' && line.type !== 'modified') continue;

            let actualType: 'added' | 'deleted';

            if (line.type === 'modified') {
              if (line.oldLineNumber && !line.newLineNumber) {
                actualType = 'deleted';
              } else if (line.newLineNumber && !line.oldLineNumber) {
                actualType = 'added';
              } else {
                continue;
              }
            } else {
              actualType = line.type as 'added' | 'deleted';
            }

            try {
              await API.sessions.stageLine(sessionId, {
                filePath: targetEntry.path,
                isStaging,
                targetLine: {
                  type: actualType,
                  oldLineNumber: line.oldLineNumber ?? null,
                  newLineNumber: line.newLineNumber ?? null,
                },
              });
            } catch (error) {
              console.error('Failed to stage line:', error);
            }
          }

          // Refresh after staging all lines
          onLineStaged?.();
        })();

        return;
      }

      // '1' - Stage selected lines (in visual mode)
      if (e.key === '1' && visualMode && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const selected = getSelectedLines();

        if (selected.length === 0 || !sessionId || !currentScope) return;

        // Stage all selected lines
        const isStaging = currentScope === 'unstaged';

        (async () => {
          for (const { line, filePath } of selected) {
            let actualType: 'added' | 'deleted';

            if (line.type === 'modified') {
              if (line.oldLineNumber && !line.newLineNumber) {
                actualType = 'deleted';
              } else if (line.newLineNumber && !line.oldLineNumber) {
                actualType = 'added';
              } else {
                continue;
              }
            } else {
              actualType = line.type as 'added' | 'deleted';
            }

            try {
              await API.sessions.stageLine(sessionId, {
                filePath,
                isStaging,
                targetLine: {
                  type: actualType,
                  oldLineNumber: line.oldLineNumber ?? null,
                  newLineNumber: line.newLineNumber ?? null,
                },
              });
            } catch (error) {
              console.error('Failed to stage line:', error);
            }
          }

          // Refresh after staging all lines
          onLineStaged?.();

          // Exit visual mode
          setVisualMode(false);
          setSelectionAnchor(null);
          setCurrentCursor(null);
        })();

        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearGgState();
    };
  }, [visualMode, selectionAnchor, currentCursor, entries, sessionId, currentScope, onLineStaged, getSelectedLines]);

  // Auto-focus container when diff loads
  useEffect(() => {
    if (diff && containerRef.current) {
      containerRef.current.focus();
    }
  }, [diff]);

  // Render shortcut hints based on current context
  const renderShortcutHints = () => {
    // Visual Mode has highest priority
    if (visualMode) {
      const hasSelection = selectionAnchor && currentCursor && getSelectedLines().length > 0;
      return (
        <>
          {hasSelection && (
            <>
              <ShortcutKey keyName="1" action={currentScope === 'unstaged' ? 'Stage selection' : 'Unstage selection'} primary />
              <Separator />
            </>
          )}
          <ShortcutKey keyName="j/k" action="Navigate" />
          <ShortcutKey keyName="gg/G" action="First/Last" />
          <Separator />
          <ShortcutKey keyName="v" action="Exit visual" />
          <ShortcutKey keyName="Esc" action="Exit visual" />
          <Separator />
          <span style={{ opacity: 0.7, fontSize: 10 }}>Click lines to select</span>
        </>
      );
    }

    // Working tree scope (staged/unstaged)
    if (currentScope === 'unstaged' || currentScope === 'staged') {
      const isStaging = currentScope === 'unstaged';
      return (
        <>
          <ShortcutKey keyName="1" action={isStaging ? 'Stage line' : 'Unstage line'} />
          <ShortcutKey keyName="v" action="Multi-select" />
          <ShortcutKey keyName="a" action={isStaging ? 'Stage all' : 'Unstage all'} primary />
          <Separator />
          <ShortcutKey keyName="Esc" action="Close" />
        </>
      );
    }

    // Commit diff (read-only)
    return (
      <>
        <ShortcutKey keyName="Esc" action="Close" />
        <span style={{ opacity: 0.6, marginLeft: 'auto', fontSize: 10 }}>Read-only view</span>
      </>
    );
  };

  if (!diff || diff.trim() === '' || entries.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-sm ${className}`}
        style={{ backgroundColor: css.bg, color: css.textMuted }}
      >
        No changes to display
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Diff viewer"
      className={`h-full flex flex-col ${className} diff-container`}
      style={{ backgroundColor: css.bg, outline: 'none' }}
    >
      {/* Visual Mode Banner - Enhanced */}
      {visualMode && (
        <div
          style={{
            backgroundColor: 'rgba(100, 150, 255, 0.18)',
            borderBottom: `2px solid rgba(100, 150, 255, 0.4)`,
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(100, 150, 255, 1)',
            fontFamily: css.fontMono,
          }}
        >
          {/* First row: Title + selection count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {/* Breathing animation dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(100, 150, 255, 1)',
                  animation: 'breathing 2s ease-in-out infinite',
                }}
              />
              Visual Mode
            </span>

            {/* Dynamic selection count badge */}
            {selectionAnchor && currentCursor && getSelectedLines().length > 0 && (
              <span
                style={{
                  backgroundColor: 'rgba(100, 150, 255, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {getSelectedLines().length} line{getSelectedLines().length !== 1 ? 's' : ''} selected
              </span>
            )}

            {/* Vim navigation position indicator */}
            {currentGlobalIndex !== null && stageableLines.length > 0 && (
              <span
                style={{
                  backgroundColor: 'rgba(100, 150, 255, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {currentGlobalIndex + 1} / {stageableLines.length}
              </span>
            )}
          </div>

          {/* Second row: Context-aware keyboard hints */}
          <div
            style={{
              fontSize: 11,
              opacity: 0.9,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              color: 'rgba(100, 150, 255, 0.95)',
            }}
          >
            {!selectionAnchor || !currentCursor || getSelectedLines().length === 0 ? (
              /* No selection - show how to select */
              <>
                <span>Click lines to select</span>
                <span>•</span>
                <kbd
                  style={{
                    backgroundColor: 'rgba(100, 150, 255, 0.25)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginLeft: '4px',
                    marginRight: '4px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 600,
                    border: '1px solid rgba(100, 150, 255, 0.4)',
                    color: 'rgba(220, 230, 255, 1)',
                  }}
                >
                  v
                </kbd>
                <span>or</span>
                <kbd
                  style={{
                    backgroundColor: 'rgba(100, 150, 255, 0.25)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginLeft: '4px',
                    marginRight: '4px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 600,
                    border: '1px solid rgba(100, 150, 255, 0.4)',
                    color: 'rgba(220, 230, 255, 1)',
                  }}
                >
                  Esc
                </kbd>
                <span>to exit</span>
              </>
            ) : (
              /* Has selection - emphasize available actions */
              <>
                <span style={{ fontWeight: 700 }}>
                  <kbd
                    style={{
                      backgroundColor: 'rgba(100, 150, 255, 0.35)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginLeft: '4px',
                      marginRight: '4px',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      fontWeight: 600,
                      border: '1px solid rgba(100, 150, 255, 0.4)',
                      color: 'rgba(220, 230, 255, 1)',
                    }}
                  >
                    1
                  </kbd>
                  {' '}to {currentScope === 'unstaged' ? 'stage' : 'unstage'} selection
                </span>
                <span>•</span>
                <span>Click more lines to extend</span>
                <span>•</span>
                <kbd
                  style={{
                    backgroundColor: 'rgba(100, 150, 255, 0.25)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginLeft: '4px',
                    marginRight: '4px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 600,
                    border: '1px solid rgba(100, 150, 255, 0.4)',
                    color: 'rgba(220, 230, 255, 1)',
                  }}
                >
                  v
                </kbd>
                <span>or</span>
                <kbd
                  style={{
                    backgroundColor: 'rgba(100, 150, 255, 0.25)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginLeft: '4px',
                    marginRight: '4px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 600,
                    border: '1px solid rgba(100, 150, 255, 0.4)',
                    color: 'rgba(220, 230, 255, 1)',
                  }}
                >
                  Esc
                </kbd>
                <span>to exit</span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 'max-content', backgroundColor: css.bg }}>
          {entries.map((entry) => {
            const collapsed = collapsedByPath[entry.path] ?? false;

            return (
              <div key={entry.key}>
                <FileHeader
                  name={entry.name}
                  dir={entry.dir}
                  stats={entry.stats}
                  collapsed={collapsed}
                  onToggle={() => toggleCollapsed(entry.path)}
                />

                {!collapsed && (
                  <div style={{ backgroundColor: css.bg }}>
                    {entry.isBinary ? (
                      <div
                        style={{
                          padding: '12px 16px',
                          fontSize: 12,
                          color: css.textMuted,
                          fontFamily: css.fontMono,
                        }}
                      >
                        Binary file
                      </div>
                    ) : entry.lines.length === 0 ? (
                      <div
                        style={{
                          padding: '12px 16px',
                          fontSize: 12,
                          color: css.textMuted,
                          fontFamily: css.fontMono,
                        }}
                      >
                        Empty file
                      </div>
                    ) : (
                      entry.lines.map((line, idx) => {
                        if (line.type === 'hunk') {
                          return <HunkRow key={`${entry.path}:hunk:${idx}`} content={line.content} />;
                        }

                        // Check if this line is selected in visual mode
                        let isSelected = false;
                        let isAnchor = false;
                        let isCursor = false;

                        if (visualMode && selectionAnchor && currentCursor && selectionAnchor.entryKey === entry.key && currentCursor.entryKey === entry.key) {
                          const start = Math.min(selectionAnchor.lineIndex, currentCursor.lineIndex);
                          const end = Math.max(selectionAnchor.lineIndex, currentCursor.lineIndex);
                          isSelected = idx >= start && idx <= end;

                          // Mark anchor and cursor positions
                          isAnchor = idx === selectionAnchor.lineIndex;
                          isCursor = idx === currentCursor.lineIndex;
                        }

                        return (
                          <DiffLineRow
                            key={`${entry.path}:${idx}`}
                            line={line}
                            sessionId={sessionId}
                            filePath={entry.path}
                            currentScope={currentScope}
                            onLineStaged={onLineStaged}
                            visualMode={visualMode}
                            isSelected={isSelected}
                            isAnchor={isAnchor}
                            isCursor={isCursor}
                            entryKey={entry.key}
                            lineIndex={idx}
                            onVisualClick={handleVisualClick}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shortcut hints bar - fixed at bottom */}
      <div
        style={{
          borderTop: `1px solid ${css.borderFaint}`,
          backgroundColor: css.headerBg,
          padding: '6px 12px',
          fontSize: 11,
          fontFamily: css.fontMono,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: css.textMuted,
          flexShrink: 0,
        }}
      >
        {renderShortcutHints()}
      </div>
    </div>
  );
};

export default ZedDiffViewer;
