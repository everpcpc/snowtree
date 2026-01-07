import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TriStateCheckbox } from './TriStateCheckbox';

describe('TriStateCheckbox', () => {
  it('renders as checked when state is checked', () => {
    render(<TriStateCheckbox state="checked" onToggle={() => {}} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.indeterminate).toBe(false);
  });

  it('renders as unchecked when state is unchecked', () => {
    render(<TriStateCheckbox state="unchecked" onToggle={() => {}} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(false);
  });

  it('renders as indeterminate when state is indeterminate', () => {
    render(<TriStateCheckbox state="indeterminate" onToggle={() => {}} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(true);
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<TriStateCheckbox state="unchecked" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('stops event propagation on click', () => {
    const parentClick = vi.fn();
    const onToggle = vi.fn();
    render(
      <div onClick={parentClick}>
        <TriStateCheckbox state="unchecked" onToggle={onToggle} />
      </div>
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<TriStateCheckbox state="checked" onToggle={() => {}} disabled />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it('applies testId when provided', () => {
    render(<TriStateCheckbox state="checked" onToggle={() => {}} testId="my-checkbox" />);
    expect(screen.getByTestId('my-checkbox')).toBeInTheDocument();
  });

  it('applies title when provided', () => {
    render(<TriStateCheckbox state="checked" onToggle={() => {}} title="Stage file" />);
    expect(screen.getByTitle('Stage file')).toBeInTheDocument();
  });
});
