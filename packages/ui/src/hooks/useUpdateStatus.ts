import { useCallback, useEffect, useState } from 'react';
import type { UpdateAvailableInfo } from '../types/electron';

type UpdateStatus = {
  updateAvailable: boolean;
  updateVersion: string;
  updateReleaseNotes: string;
  updateDownloading: boolean;
  updateDownloaded: boolean;
  updateInstalling: boolean;
  updateError: string;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
};

export function useUpdateStatus(): UpdateStatus {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateReleaseNotes, setUpdateReleaseNotes] = useState<string>('');
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [updateError, setUpdateError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const events = window.electronAPI?.events;

    if (
      !events ||
      typeof events.onUpdateAvailable !== 'function' ||
      typeof events.onUpdateDownloaded !== 'function'
    ) {
      return () => {
        mounted = false;
      };
    }

    const unsubscribes = [
      events.onUpdateAvailable((info: UpdateAvailableInfo) => {
        if (!mounted) return;
        setUpdateAvailable(true);
        setUpdateVersion(info?.version || '');
        setUpdateReleaseNotes(info?.releaseNotes || '');
        setUpdateDownloaded(false);
        setUpdateInstalling(false);
        setUpdateError('');
      }),
      events.onUpdateDownloaded(() => {
        if (!mounted) return;
        setUpdateDownloading(false);
        setUpdateDownloaded(true);
        setUpdateInstalling(false);
      }),
    ];

    return () => {
      mounted = false;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!window.electronAPI?.updater) return;
    setUpdateDownloading(true);
    setUpdateError('');
    try {
      const res = await window.electronAPI.updater.download();
      if (!res?.success) {
        setUpdateDownloading(false);
        setUpdateError(res?.error || 'Failed to download update');
      }
    } catch (e) {
      setUpdateDownloading(false);
      setUpdateError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!window.electronAPI?.updater) return;
    try {
      setUpdateInstalling(true);
      setUpdateError('');
      const res = await window.electronAPI.updater.install();
      if (!res?.success) {
        setUpdateInstalling(false);
        setUpdateError(res?.error || 'Failed to install update');
      }
    } catch (e) {
      setUpdateInstalling(false);
      setUpdateError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return {
    updateAvailable,
    updateVersion,
    updateReleaseNotes,
    updateDownloading,
    updateDownloaded,
    updateInstalling,
    updateError,
    downloadUpdate,
    installUpdate,
  };
}
