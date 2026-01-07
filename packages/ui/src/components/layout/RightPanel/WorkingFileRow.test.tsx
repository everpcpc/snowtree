import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkingFileRow } from './WorkingFileRow';

describe('WorkingFileRow', () => {
  const defaultFile = {
    path: 'src/app.ts',
    type: 'modified' as const,
    additions: 8,
    deletions: 3,
  };

  it('renders file path', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
      />
    );
    expect(screen.getByText('src/app.ts')).toBeInTheDocument();
  });

  it('renders checkbox with checked state', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="checked"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
      />
    );
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('renders checkbox with unchecked state', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
      />
    );
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('renders checkbox with indeterminate state', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="indeterminate"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
      />
    );
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it('calls onToggleStage when checkbox is clicked', () => {
    const onToggleStage = vi.fn();
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={onToggleStage}
        onClick={() => {}}
        isSelected={false}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleStage).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when row is clicked', () => {
    const onClick = vi.fn();
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={() => {}}
        onClick={onClick}
        isSelected={false}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when checkbox is clicked', () => {
    const onClick = vi.fn();
    const onToggleStage = vi.fn();
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={onToggleStage}
        onClick={onClick}
        isSelected={false}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleStage).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disables checkbox when disabled prop is true', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
        disabled
      />
    );
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it('renders additions and deletions', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
      />
    );
    expect(screen.getByText('+8')).toBeInTheDocument();
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('applies testId to checkbox when provided', () => {
    render(
      <WorkingFileRow
        file={defaultFile}
        stageState="unchecked"
        onToggleStage={() => {}}
        onClick={() => {}}
        isSelected={false}
        testId="my-row"
      />
    );
    expect(screen.getByTestId('my-row-checkbox')).toBeInTheDocument();
  });
});
