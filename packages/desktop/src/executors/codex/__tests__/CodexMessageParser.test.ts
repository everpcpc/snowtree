import { describe, it, expect } from 'vitest';
import { CodexMessageParser } from '../CodexMessageParser';

describe('CodexMessageParser (v2)', () => {
  it('coalesces short reasoning deltas into a single thinking event per turn', () => {
    const parser = new CodexMessageParser();
    const panelId = 'panel-1';

    parser.parseV2Notification('turn/started', {}, panelId);

    const a = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r1', delta: '**Sear' }, panelId);
    const b = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r1', delta: 'ching**' }, panelId);

    expect(a?.entryType).toBe('thinking');
    expect(b?.entryType).toBe('thinking');
    expect(a?.id).toBe(b?.id);
    expect(b?.content).toBe('Searching');
    expect((b?.metadata as { streaming?: unknown } | undefined)?.streaming).toBe(true);

    const c = parser.parseV2Notification(
      'item/completed',
      { item: { type: 'reasoning', id: 'r1', summary: [], content: [] } },
      panelId
    );

    expect(c?.entryType).toBe('thinking');
    expect(c?.id).toBe(a?.id);
    expect(c?.content).toBe('Searching');
    expect((c?.metadata as { streaming?: unknown } | undefined)?.streaming).toBeUndefined();
  });

  it('clears coalesced thinking streaming on turn completed', () => {
    const parser = new CodexMessageParser();
    const panelId = 'panel-4';

    parser.parseV2Notification('turn/started', {}, panelId);
    const a = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r5', delta: '**Preparing**' }, panelId);
    expect(a?.entryType).toBe('thinking');
    expect((a?.metadata as { streaming?: unknown } | undefined)?.streaming).toBe(true);

    const done = parser.parseV2Notification('turn/completed', {}, panelId);
    expect(done?.entryType).toBe('thinking');
    expect(done?.id).toBe(a?.id);
    expect(done?.content).toBe('Preparing');
    expect((done?.metadata as { streaming?: unknown } | undefined)?.streaming).toBe(false);
  });

  it('keeps multi-line reasoning as item-scoped thinking events', () => {
    const parser = new CodexMessageParser();
    const panelId = 'panel-2';

    parser.parseV2Notification('turn/started', {}, panelId);

    const a = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r2', delta: 'line 1\n' }, panelId);
    const b = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r2', delta: 'line 2' }, panelId);

    expect(a?.entryType).toBe('thinking');
    expect(b?.entryType).toBe('thinking');
    expect(a?.id).toBe('r2');
    expect(b?.id).toBe('r2');
    expect(b?.content).toBe('line 1\nline 2');

    const c = parser.parseV2Notification(
      'item/completed',
      { item: { type: 'reasoning', id: 'r2', summary: [], content: [] } },
      panelId
    );

    expect(c?.entryType).toBe('thinking');
    expect(c?.id).toBe('r2');
    expect(c?.content).toBe('line 1\nline 2');
  });

  it('starts a new coalesced thinking id on each turn', () => {
    const parser = new CodexMessageParser();
    const panelId = 'panel-3';

    parser.parseV2Notification('turn/started', {}, panelId);
    const a = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r3', delta: '**Draft**' }, panelId);

    parser.parseV2Notification('turn/started', {}, panelId);
    const b = parser.parseV2Notification('item/reasoning/textDelta', { item_id: 'r4', delta: '**Draft**' }, panelId);

    expect(a?.entryType).toBe('thinking');
    expect(b?.entryType).toBe('thinking');
    expect(a?.id).not.toBe(b?.id);
  });
});
