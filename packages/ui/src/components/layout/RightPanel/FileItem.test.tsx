import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileItem } from './FileItem';

describe('FileItem', () => {
  const defaultFile = {
    path: 'src/index.ts',
    type: 'modified' as const,
    additions: 10,
    deletions: 5,
  };

  it('renders file path', () => {
    render(<FileItem file={defaultFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
  });

  it('renders type badge with correct label', () => {
    render(<FileItem file={defaultFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders additions count', () => {
    render(<FileItem file={defaultFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('renders deletions count', () => {
    render(<FileItem file={defaultFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('does not render additions when 0', () => {
    const file = { ...defaultFile, additions: 0 };
    render(<FileItem file={file} onClick={() => {}} isSelected={false} />);
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });

  it('does not render deletions when 0', () => {
    const file = { ...defaultFile, deletions: 0 };
    render(<FileItem file={file} onClick={() => {}} isSelected={false} />);
    expect(screen.queryByText('-0')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<FileItem file={defaultFile} onClick={onClick} isSelected={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies testId when provided', () => {
    render(
      <FileItem
        file={defaultFile}
        onClick={() => {}}
        isSelected={false}
        testId="my-file-item"
      />
    );
    expect(screen.getByTestId('my-file-item')).toBeInTheDocument();
  });

  it('renders correct badge for added files', () => {
    const addedFile = { ...defaultFile, type: 'added' as const };
    render(<FileItem file={addedFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders correct badge for deleted files', () => {
    const deletedFile = { ...defaultFile, type: 'deleted' as const };
    render(<FileItem file={deletedFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders correct badge for renamed files', () => {
    const renamedFile = { ...defaultFile, type: 'renamed' as const };
    render(<FileItem file={renamedFile} onClick={() => {}} isSelected={false} />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });
});
