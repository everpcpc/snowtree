/**
 * CodexMessageParser - Parse Codex JSON-RPC notifications into normalized entries
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  NormalizedEntry,
} from '../types';

/**
 * Parses Codex event notifications into normalized entries for UI display
 */
export class CodexMessageParser {
  private reasoningByPanel = new Map<string, { id: string; text: string }>();
  private assistantDeltaByItem = new Map<string, { id: string; text: string }>();
  private reasoningDeltaByItem = new Map<string, { id: string; text: string }>();

  private beginNewTurn(panelId?: string): void {
    if (!panelId) return;
    this.reasoningByPanel.delete(panelId);
  }

  private normalizeReasoningText(raw: unknown): string {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) return '';
    if (text.includes('\n')) return text;

    // Codex sometimes emits short "phase" markers using markdown-ish prefixes like:
    // "*#Draft", "**Selecting", "# Preparing". We display thinking as plain text, so
    // strip those prefixes for cleaner UI while preserving real bullet lines.
    if (/^\s*[*-]\s+/.test(text)) return text;

    let stripped = text
      .replace(/^\s*(?:\*+#+|#+\*+|\*{2,}|#{1,6})\s*/, '')
      .trimStart();

    // Also trim trailing emphasis markers for these short phase strings.
    stripped = stripped
      .replace(/\s*\*{1,3}\s*$/, '')
      .replace(/\s*#{1,6}\s*$/, '')
      .trimEnd();

    return stripped || text;
  }

  /**
   * Parse a Codex app-server v2 JSON-RPC notification (preferred).
   */
  parseV2Notification(method: string, params: unknown, panelId?: string): NormalizedEntry | null {
    const timestamp = new Date().toISOString();

    switch (method) {
      case 'thread/started':
        return {
          id: uuidv4(),
          timestamp,
          entryType: 'system_message',
          content: 'Thread started',
          metadata: params as Record<string, unknown>,
        };

      case 'turn/started':
        this.beginNewTurn(panelId);
        return {
          id: uuidv4(),
          timestamp,
          entryType: 'system_message',
          content: 'Turn started',
          metadata: params as Record<string, unknown>,
        };

      case 'turn/completed':
        // Ensure any coalesced single-line thinking gets marked non-streaming at end of turn,
        // even if the server doesn't emit a matching `item/completed` for the reasoning item.
        if (panelId) {
          const current = this.reasoningByPanel.get(panelId);
          if (current && current.text) {
            return {
              id: current.id,
              timestamp,
              entryType: 'thinking',
              content: current.text,
              metadata: { ...(params as Record<string, unknown>), streaming: false },
            };
          }
        }
        return null;

      case 'turn/plan/updated':
        return this.parseTurnPlanUpdated(params, timestamp);

      case 'item/agentMessage/delta':
        return this.parseV2AgentMessageDelta(params, timestamp, panelId);

      case 'item/reasoning/textDelta':
      case 'item/reasoning/summaryTextDelta':
        return this.parseV2ReasoningDelta(params, timestamp, panelId);

      case 'item/started':
        return this.parseV2ItemStarted(params, timestamp, panelId);

      case 'item/completed':
        return this.parseV2ItemCompleted(params, timestamp, panelId);

      // We intentionally do not surface output deltas in the timeline (audit focuses on commands/actions).
      case 'item/commandExecution/outputDelta':
      case 'item/fileChange/outputDelta':
      case 'item/mcpToolCall/progress':
      case 'turn/diff/updated':
      case 'thread/tokenUsage/updated':
      case 'thread/compacted':
        return null;

      case 'error':
        return this.parseV2Error(params, timestamp);

      default:
        return null;
    }
  }

  /**
   * Parse Codex app-server v2 streaming agent message deltas.
   */
  private parseV2AgentMessageDelta(params: unknown, timestamp: string, panelId?: string): NormalizedEntry | null {
    const p = params as { itemId?: unknown; delta?: unknown; item_id?: unknown };
    const itemId = typeof p.itemId === 'string'
      ? p.itemId
      : typeof p.item_id === 'string'
        ? p.item_id
        : '';
    const delta = typeof p.delta === 'string' ? p.delta : '';
    if (!itemId || !delta) return null;

    const current = this.assistantDeltaByItem.get(itemId) || { id: itemId, text: '' };
    current.text += delta;
    this.assistantDeltaByItem.set(itemId, current);

    return {
      id: current.id,
      timestamp,
      entryType: 'assistant_message',
      content: current.text,
      metadata: {
        streaming: true,
        panelId,
        ...(params as Record<string, unknown>),
      },
    };
  }

  private parseV2ReasoningDelta(params: unknown, timestamp: string, panelId?: string): NormalizedEntry | null {
    const p = params as { itemId?: unknown; delta?: unknown; item_id?: unknown };
    const itemId = typeof p.itemId === 'string'
      ? p.itemId
      : typeof p.item_id === 'string'
        ? p.item_id
        : '';
    const delta = typeof p.delta === 'string' ? p.delta : '';
    if (!itemId || !delta) return null;

    const current = this.reasoningDeltaByItem.get(itemId) || { id: itemId, text: '' };
    current.text += delta;
    this.reasoningDeltaByItem.set(itemId, current);

    const merged = this.maybeCoalesceReasoning(panelId, current.text, timestamp, {
      streaming: true,
      ...(params as Record<string, unknown>),
    });
    if (merged) return merged;

    return {
      id: current.id,
      timestamp,
      entryType: 'thinking',
      content: current.text,
      metadata: {
        streaming: true,
        ...(params as Record<string, unknown>),
      },
    };
  }

  private parseV2ItemStarted(params: unknown, timestamp: string, panelId?: string): NormalizedEntry | null {
    const p = params as { item?: unknown };
    const item = (p && typeof p === 'object' && 'item' in p) ? (p as { item: unknown }).item : null;
    if (!item || typeof item !== 'object') return null;
    return this.parseV2ThreadItem(item as Record<string, unknown>, timestamp, 'started', panelId);
  }

  private parseV2ItemCompleted(params: unknown, timestamp: string, panelId?: string): NormalizedEntry | null {
    const p = params as { item?: unknown };
    const item = (p && typeof p === 'object' && 'item' in p) ? (p as { item: unknown }).item : null;
    if (!item || typeof item !== 'object') return null;
    return this.parseV2ThreadItem(item as Record<string, unknown>, timestamp, 'completed', panelId);
  }

  private parseV2ThreadItem(
    item: Record<string, unknown>,
    timestamp: string,
    phase: 'started' | 'completed',
    panelId?: string
  ): NormalizedEntry | null {
    const type = typeof item.type === 'string' ? item.type : '';
    const id = typeof item.id === 'string' ? item.id : uuidv4();

    if (type === 'agentMessage') {
      if (phase === 'completed') {
        const streamed = this.assistantDeltaByItem.get(id);
        if (streamed) {
          this.assistantDeltaByItem.delete(id);
          return {
            id,
            timestamp,
            entryType: 'assistant_message',
            content: streamed.text,
            metadata: item,
          };
        }

        const text = typeof item.text === 'string' ? item.text : '';
        if (!text) return null;
        return {
          id,
          timestamp,
          entryType: 'assistant_message',
          content: text,
          metadata: item,
        };
      }
      return null;
    }

    if (type === 'reasoning') {
      if (phase === 'completed') {
        const streamed = this.reasoningDeltaByItem.get(id);
        if (streamed) {
          this.reasoningDeltaByItem.delete(id);
          const merged = this.maybeCoalesceReasoning(panelId, streamed.text, timestamp, item);
          return merged || {
            id,
            timestamp,
            entryType: 'thinking',
            content: streamed.text,
            metadata: item,
          };
        }

        const summary = Array.isArray(item.summary) ? item.summary.map(String).join('\n') : '';
        const content = Array.isArray(item.content) ? item.content.map(String).join('\n') : '';
        const text = [summary, content].filter(Boolean).join('\n');
        if (!text) return null;
        const merged = this.maybeCoalesceReasoning(panelId, text, timestamp, item);
        return merged || {
          id,
          timestamp,
          entryType: 'thinking',
          content: text,
          metadata: item,
        };
      }
      return null;
    }

    if (type === 'commandExecution') {
      const command = typeof item.command === 'string' ? item.command : '';
      if (!command) return null;

      if (phase === 'started') {
        return {
          id,
          timestamp,
          entryType: 'tool_use',
          content: command,
          toolName: 'commandExecution',
          toolStatus: 'pending',
          actionType: { type: 'command_run', command },
          metadata: item,
        };
      }

      const status = typeof item.status === 'string' ? item.status : '';
      const ok = status === 'completed';
      return {
        id,
        timestamp,
        entryType: 'tool_result',
        content: '',
        toolStatus: ok ? 'success' : 'failed',
        metadata: item,
      };
    }

    if (type === 'fileChange') {
      const changes = Array.isArray(item.changes) ? item.changes : [];
      const paths = changes
        .map((c) => (c && typeof c === 'object' && typeof (c as { path?: unknown }).path === 'string') ? String((c as { path: unknown }).path) : '')
        .filter(Boolean);
      const label = paths.length <= 3
        ? `Apply patch: ${paths.join(', ') || 'changes'}`
        : `Apply patch: ${paths.slice(0, 3).join(', ')} (+${paths.length - 3} more)`;

      if (phase === 'started') {
        return {
          id,
          timestamp,
          entryType: 'tool_use',
          content: label,
          toolName: 'fileChange',
          toolStatus: 'pending',
          actionType: { type: 'file_edit', path: paths[0] ? String(paths[0]) : '' },
          metadata: item,
        };
      }

      const status = typeof item.status === 'string' ? item.status : '';
      const ok = status === 'completed';
      return {
        id,
        timestamp,
        entryType: 'tool_result',
        content: '',
        toolStatus: ok ? 'success' : 'failed',
        metadata: item,
      };
    }

    if (type === 'mcpToolCall') {
      const server = typeof item.server === 'string' ? item.server : '';
      const tool = typeof item.tool === 'string' ? item.tool : '';
      const label = server && tool ? `MCP ${server}::${tool}` : 'MCP tool call';

      if (phase === 'started') {
        return {
          id,
          timestamp,
          entryType: 'tool_use',
          content: label,
          toolName: 'mcpToolCall',
          toolStatus: 'pending',
          actionType: { type: 'other', description: label },
          metadata: item,
        };
      }

      const status = typeof item.status === 'string' ? item.status : '';
      const ok = status === 'completed';
      return {
        id,
        timestamp,
        entryType: 'tool_result',
        content: '',
        toolStatus: ok ? 'success' : 'failed',
        metadata: item,
      };
    }

    if (type === 'webSearch') {
      const query = typeof item.query === 'string' ? item.query : '';
      if (!query) return null;
      if (phase === 'started') {
        return {
          id,
          timestamp,
          entryType: 'tool_use',
          content: `Web search: ${query}`,
          toolName: 'webSearch',
          toolStatus: 'pending',
          actionType: { type: 'web_fetch', url: query },
          metadata: item,
        };
      }
      return {
        id,
        timestamp,
        entryType: 'tool_result',
        content: '',
        toolStatus: 'success',
        metadata: item,
      };
    }

    return null;
  }

  private maybeCoalesceReasoning(
    panelId: string | undefined,
    rawText: string,
    timestamp: string,
    metadata: Record<string, unknown>
  ): NormalizedEntry | null {
    if (!panelId) return null;

    // Only coalesce short single-line phase/status markers.
    // Use rawText (pre-normalization) to avoid `.trim()` masking newlines during streaming.
    if (rawText.includes('\n')) return null;

    const normalized = this.normalizeReasoningText(rawText);
    const isSingleLine = !normalized.includes('\n');
    // Only coalesce short "phase/status" markers. Keep longer reasoning as standalone messages.
    if (!isSingleLine || normalized.length > 120) return null;

    const key = panelId;
    const current = this.reasoningByPanel.get(key) || { id: uuidv4(), text: '' };
    current.text = normalized;
    this.reasoningByPanel.set(key, current);

    return {
      id: current.id,
      timestamp,
      entryType: 'thinking',
      content: current.text,
      metadata,
    };
  }

  private parseTurnPlanUpdated(params: unknown, timestamp: string): NormalizedEntry | null {
    const p = params as { explanation?: unknown; plan?: unknown };
    const explanation = typeof p.explanation === 'string' ? p.explanation : '';
    const plan = Array.isArray(p.plan) ? p.plan : [];
    const lines = plan
      .map((step) => {
        const s = step as { step?: unknown; status?: unknown };
        const label = typeof s.step === 'string' ? s.step : '';
        const status = typeof s.status === 'string' ? s.status : '';
        return label ? `${status || 'pending'}: ${label}` : '';
      })
      .filter(Boolean);

    const content = [explanation, ...lines].filter(Boolean).join('\n');
    if (!content) return null;
    return {
      id: uuidv4(),
      timestamp,
      entryType: 'system_message',
      content,
      metadata: params as Record<string, unknown>,
    };
  }

  private parseV2Error(params: unknown, timestamp: string): NormalizedEntry {
    const p = params as { error?: unknown };
    const err = p && typeof p === 'object' && 'error' in p ? (p as { error: unknown }).error : null;
    const message = err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
      ? String((err as { message: unknown }).message)
      : 'Unknown error';
    return {
      id: uuidv4(),
      timestamp,
      entryType: 'error_message',
      content: message,
      metadata: params as Record<string, unknown>,
    };
  }
}

export default CodexMessageParser;
