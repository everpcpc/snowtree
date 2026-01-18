import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useUpdateStatus } from './useUpdateStatus';

function Harness() {
  const {
    updateAvailable,
    updateVersion,
    updateReleaseNotes,
    updateDownloading,
    updateDownloaded,
    updateInstalling,
    updateError,
    downloadUpdate,
    installUpdate,
  } = useUpdateStatus();

  return (
    <div>
      <div data-testid="update-available">{String(updateAvailable)}</div>
      <div data-testid="update-version">{updateVersion}</div>
      <div data-testid="update-notes">{updateReleaseNotes}</div>
      <div data-testid="update-downloading">{String(updateDownloading)}</div>
      <div data-testid="update-downloaded">{String(updateDownloaded)}</div>
      <div data-testid="update-installing">{String(updateInstalling)}</div>
      <div data-testid="update-error">{updateError}</div>
      <button type="button" onClick={() => void downloadUpdate()}>download</button>
      <button type="button" onClick={() => void installUpdate()}>install</button>
    </div>
  );
}

describe('useUpdateStatus', () => {
  let updateAvailableCb: ((info: { version: string; releaseNotes?: string }) => void) | null = null;
  let updateDownloadedCb: (() => void) | null = null;
  let downloadMock: ReturnType<typeof vi.fn>;
  let installMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateAvailableCb = null;
    updateDownloadedCb = null;
    downloadMock = vi.fn().mockResolvedValue({ success: true });
    installMock = vi.fn().mockResolvedValue({ success: true });

    (globalThis as unknown as { window: Window & typeof globalThis }).window.electronAPI = {
      updater: {
        download: downloadMock,
        install: installMock,
      },
      events: {
        onUpdateAvailable: vi.fn((cb: (info: { version: string; releaseNotes?: string }) => void) => {
          updateAvailableCb = cb;
          return () => {
            updateAvailableCb = null;
          };
        }),
        onUpdateDownloaded: vi.fn((cb: () => void) => {
          updateDownloadedCb = cb;
          return () => {
            updateDownloadedCb = null;
          };
        }),
      },
    } as any;
  });

  it('reflects update availability and release notes from events', async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(updateAvailableCb).not.toBeNull();
    });
    updateAvailableCb?.({ version: '1.2.3', releaseNotes: 'Changelog line' });

    await waitFor(() => {
      expect(screen.getByTestId('update-available')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('update-version')).toHaveTextContent('1.2.3');
    expect(screen.getByTestId('update-notes')).toHaveTextContent('Changelog line');
  });

  it('surfaces download errors and clears downloading flag', async () => {
    downloadMock.mockResolvedValueOnce({ success: false, error: 'Download failed' });
    render(<Harness />);

    fireEvent.click(screen.getByText('download'));

    await waitFor(() => {
      expect(screen.getByTestId('update-error')).toHaveTextContent('Download failed');
    });
    expect(screen.getByTestId('update-downloading')).toHaveTextContent('false');
  });

  it('marks update as downloaded when update-downloaded event fires', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('download'));
    await waitFor(() => {
      expect(screen.getByTestId('update-downloading')).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(updateDownloadedCb).not.toBeNull();
    });
    updateDownloadedCb?.();

    await waitFor(() => {
      expect(screen.getByTestId('update-downloaded')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('update-downloading')).toHaveTextContent('false');
  });
});
