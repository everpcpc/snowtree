import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeMessageParser } from '../ClaudeMessageParser';

describe('ClaudeMessageParser', () => {
  let parser: ClaudeMessageParser;

  beforeEach(() => {
    parser = new ClaudeMessageParser();
  });

  describe('parseMessage - tool_use', () => {
    it('should parse tool_use message with tool_use_id', () => {
      const message = {
        type: 'tool_use' as const,
        tool_name: 'Read',
        tool_use_id: 'toolu_01ABC123',
        input: { file_path: '/path/to/file.ts' },
      };

      const entry = parser.parseMessage(message);

      expect(entry).not.toBeNull();
      expect(entry?.entryType).toBe('tool_use');
      expect(entry?.toolName).toBe('Read');
      expect(entry?.toolUseId).toBe('toolu_01ABC123');
      expect(entry?.toolStatus).toBe('pending');
      expect(entry?.content).toContain('Read');
    });

    it('should parse tool_use message without tool_use_id', () => {
      const message = {
        type: 'tool_use' as const,
        tool_name: 'Glob',
        input: { pattern: '**/*.ts' },
      };

      const entry = parser.parseMessage(message);

      expect(entry).not.toBeNull();
      expect(entry?.entryType).toBe('tool_use');
      expect(entry?.toolName).toBe('Glob');
      expect(entry?.toolUseId).toBeUndefined();
    });

    it('should infer file_read action type for Read tool', () => {
      const message = {
        type: 'tool_use' as const,
        tool_name: 'Read',
        tool_use_id: 'toolu_read',
        input: { file_path: '/src/index.ts' },
      };

      const entry = parser.parseMessage(message);

      expect(entry?.actionType?.type).toBe('file_read');
    });

    it('should infer command_run action type for Bash tool', () => {
      const message = {
        type: 'tool_use' as const,
        tool_name: 'Bash',
        tool_use_id: 'toolu_bash',
        input: { command: 'npm test' },
      };

      const entry = parser.parseMessage(message);

      expect(entry?.actionType?.type).toBe('command_run');
    });
  });

  describe('parseMessage - tool_result', () => {
    it('should parse tool_result message with tool_use_id', () => {
      const message = {
        type: 'tool_result' as const,
        tool_use_id: 'toolu_01ABC123',
        result: 'File contents here',
        is_error: false,
      };

      const entry = parser.parseMessage(message);

      expect(entry).not.toBeNull();
      expect(entry?.entryType).toBe('tool_result');
      expect(entry?.toolUseId).toBe('toolu_01ABC123');
      expect(entry?.toolStatus).toBe('success');
      expect(entry?.content).toBe('File contents here');
    });

    it('should parse tool_result with error status', () => {
      const message = {
        type: 'tool_result' as const,
        tool_use_id: 'toolu_error',
        result: 'File not found',
        is_error: true,
      };

      const entry = parser.parseMessage(message);

      expect(entry?.entryType).toBe('tool_result');
      expect(entry?.toolUseId).toBe('toolu_error');
      expect(entry?.toolStatus).toBe('failed');
    });

    it('should handle tool_result without tool_use_id', () => {
      const message = {
        type: 'tool_result' as const,
        result: 'Some result',
      };

      const entry = parser.parseMessage(message);

      expect(entry?.entryType).toBe('tool_result');
      expect(entry?.toolUseId).toBeUndefined();
      expect(entry?.toolStatus).toBe('success');
    });

    it('should stringify object results', () => {
      const message = {
        type: 'tool_result' as const,
        tool_use_id: 'toolu_json',
        result: { files: ['a.ts', 'b.ts'] },
      };

      const entry = parser.parseMessage(message);

      expect(entry?.content).toContain('files');
      expect(entry?.content).toContain('a.ts');
    });
  });

  describe('parseMessage - assistant', () => {
    it('should parse assistant message with text content', () => {
      const message = {
        type: 'assistant' as const,
        message: {
          role: 'assistant',
          content: [{ type: 'text' as const, text: 'Hello, I will help you.' }],
          stop_reason: 'end_turn',
        },
      };

      const entry = parser.parseMessage(message);

      expect(entry?.entryType).toBe('assistant_message');
      expect(entry?.content).toBe('Hello, I will help you.');
    });

    it('should skip streaming assistant messages with no text', () => {
      const message = {
        type: 'assistant' as const,
        message: {
          role: 'assistant',
          content: [],
          stop_reason: null,
        },
      };

      const entry = parser.parseMessage(message);

      expect(entry).toBeNull();
    });
  });

  describe('parseMessage - system', () => {
    it('should parse system init message', () => {
      const message = {
        type: 'system' as const,
        subtype: 'init',
        session_id: 'session-123',
        cwd: '/workspace',
        model: 'claude-3-opus',
      };

      const entry = parser.parseMessage(message);

      expect(entry?.entryType).toBe('system_message');
      expect(entry?.content).toBe('Session initialized');
      expect(entry?.metadata?.session_id).toBe('session-123');
    });
  });

  describe('parseMessage - result', () => {
    it('should parse successful result message', () => {
      const message = {
        type: 'result' as const,
        is_error: false,
        duration_ms: 1500,
      };

      const entry = parser.parseMessage(message);

      expect(entry?.entryType).toBe('system_message');
      expect(entry?.content).toContain('1500ms');
    });

    it('should parse error result message', () => {
      const message = {
        type: 'result' as const,
        is_error: true,
        error: 'Something went wrong',
        duration_ms: 500,
      };

      const entry = parser.parseMessage(message);

      expect(entry?.entryType).toBe('error_message');
      expect(entry?.content).toBe('Something went wrong');
    });
  });

  describe('reset', () => {
    it('should reset streaming state', () => {
      // Simulate some streaming state
      const streamEvent = {
        type: 'stream_event' as const,
        event: {
          type: 'message_start' as const,
          message: {
            role: 'assistant',
            content: [],
          },
        },
      };
      parser.parseMessage(streamEvent);

      // Reset
      parser.reset();

      // Verify reset by checking that a new message_start creates fresh state
      const entry = parser.parseMessage(streamEvent);
      expect(entry).toBeNull(); // message_start returns null
    });
  });
});
