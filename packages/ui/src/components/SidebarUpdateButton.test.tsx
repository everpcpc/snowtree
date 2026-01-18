import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarUpdateButton } from './SidebarUpdateButton';

describe('SidebarUpdateButton', () => {
  it('calls download when update is not downloaded', () => {
    const onDownload = vi.fn().mockResolvedValue(undefined);
    const onInstall = vi.fn().mockResolvedValue(undefined);

    render(
      <SidebarUpdateButton
        version="1.2.3"
        releaseNotes=""
        isDownloading={false}
        isDownloaded={false}
        isInstalling={false}
        onDownload={onDownload}
        onInstall={onInstall}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /update v1.2.3/i }));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onInstall).not.toHaveBeenCalled();
  });

  it('calls install when update is downloaded', () => {
    const onDownload = vi.fn().mockResolvedValue(undefined);
    const onInstall = vi.fn().mockResolvedValue(undefined);

    render(
      <SidebarUpdateButton
        version="1.2.3"
        releaseNotes=""
        isDownloading={false}
        isDownloaded={true}
        isInstalling={false}
        onDownload={onDownload}
        onInstall={onInstall}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /restart v1.2.3/i }));

    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('shows release notes on hover when provided', () => {
    render(
      <SidebarUpdateButton
        version="1.2.3"
        releaseNotes={'Line one\nLine two'}
        isDownloading={false}
        isDownloaded={false}
        isInstalling={false}
        onDownload={vi.fn().mockResolvedValue(undefined)}
        onInstall={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const button = screen.getByRole('button', { name: /update v1.2.3/i });
    expect(screen.queryByText(/changelog v1.2.3/i)).not.toBeInTheDocument();

    fireEvent.mouseEnter(button);

    expect(screen.getByText(/changelog v1.2.3/i)).toBeInTheDocument();
    expect(screen.getByText(/line one/i)).toBeInTheDocument();
    expect(screen.getByText(/line two/i)).toBeInTheDocument();

    fireEvent.mouseLeave(button);

    expect(screen.queryByText(/changelog v1.2.3/i)).not.toBeInTheDocument();
  });
});
