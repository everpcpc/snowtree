import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { DiffOverlay } from './DiffOverlay';
import { API } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  API: {
    sessions: {
      getDiff: vi.fn(),
      getFileContent: vi.fn(),
    },
  },
}));

describe('DiffOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (API.sessions.getDiff as any).mockResolvedValue({ success: true, data: { diff: '' } });
    (API.sessions.getFileContent as any).mockResolvedValue({ success: true, data: { content: 'a\nb\nc' } });
  });

  it('reloads when filePath changes while open', async () => {
    const props = {
      isOpen: true,
      sessionId: 's1',
      filePath: 'a.txt',
      target: { kind: 'working', scope: 'all' } as any,
      onClose: vi.fn(),
      files: [],
    };

    const { rerender } = render(<DiffOverlay {...(props as any)} />);

    await waitFor(() => {
      expect(API.sessions.getFileContent).toHaveBeenCalledWith('s1', expect.objectContaining({ filePath: 'a.txt' }));
    });

    rerender(<DiffOverlay {...({ ...props, filePath: 'b.txt' } as any)} />);

    await waitFor(() => {
      expect(API.sessions.getFileContent).toHaveBeenCalledWith('s1', expect.objectContaining({ filePath: 'b.txt' }));
    });
  });
});

