import React, { useRef, useEffect } from 'react';
import { colors } from './constants';
import type { TriStateCheckboxProps } from './types';

export const TriStateCheckbox: React.FC<TriStateCheckboxProps> = React.memo(
  ({ state, disabled, onToggle, testId, title }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = state === 'indeterminate';
      }
    }, [state]);

    return (
      <input
        ref={inputRef}
        data-testid={testId}
        type="checkbox"
        checked={state === 'checked'}
        disabled={disabled}
        title={title}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggle()}
        className="st-focus-ring"
        style={{
          width: 14,
          height: 14,
          accentColor: colors.accent,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
    );
  }
);

TriStateCheckbox.displayName = 'TriStateCheckbox';
