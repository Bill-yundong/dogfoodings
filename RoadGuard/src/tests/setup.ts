import '@testing-library/jest-dom';
import { vi } from 'vitest';

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const mockCanvas = {
  getContext: vi.fn(() => ({
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 2,
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  width: 800,
  height: 600,
};

vi.stubGlobal('HTMLCanvasElement', mockCanvas);
vi.stubGlobal('createElement', vi.fn((tag) => {
  if (tag === 'canvas') return mockCanvas;
  return document.createElement(tag);
}));
