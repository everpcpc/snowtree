import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.electronAPI
global.window = global.window || {};
(global.window as any).electronAPI = {
  invoke: vi.fn(),
  on: vi.fn(),
  send: vi.fn(),
};

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock Element.scrollIntoView (not supported in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Export expect for tests
export { expect };
