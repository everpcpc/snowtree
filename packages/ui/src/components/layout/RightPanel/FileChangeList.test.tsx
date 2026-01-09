import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileChangeList } from './FileChangeList';

describe('FileChangeList', () => {
  it('does not replace empty state with spinner during background refresh', () => {
    render(
      <FileChangeList
        isWorkingTreeSelected={false}
        isLoading={true}
        error={null}
        workingTree={{ staged: [], unstaged: [], untracked: [] }}
        commitFiles={[]}
        trackedList={[]}
        untrackedList={[]}
        selectedFile={null}
        selectedFileScope={null}
        isDisabled={false}
        workingFilesForDiffOverlay={[]}
        onRefresh={() => {}}
        onStageFile={() => {}}
        onWorkingFileClick={() => {}}
        onCommitFileClick={() => {}}
        hasSelection={false}
      />
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Select a commit')).toBeInTheDocument();
  });
});

