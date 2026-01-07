import React, { useId } from 'react';
import { stack } from './constants';
import type { StackConnectorProps } from './types';

export const StackConnector: React.FC<StackConnectorProps> = React.memo(
  ({ accent }) => {
    const gradId = useId();
    const line = accent ? stack.lineAccent : stack.line;
    const arrow = accent ? stack.arrowAccent : stack.arrow;

    return (
      <div className="relative flex-1 w-4 st-stack-connector">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 16 28"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={line} stopOpacity="0" />
              <stop offset="0.2" stopColor={line} stopOpacity="0.9" />
              <stop offset="0.8" stopColor={line} stopOpacity="0.9" />
              <stop offset="1" stopColor={line} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M8 0V28"
            stroke={`url(#${gradId})`}
            strokeWidth="1"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M6.25 13.75 L8 15.5 L9.75 13.75"
            fill="none"
            stroke={arrow}
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  }
);

StackConnector.displayName = 'StackConnector';
